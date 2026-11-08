import { readFile, writeFile, mkdir } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

const permissions = [
  '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />'
];
for (const permission of permissions) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace('<application', permission + '\n    <application');
  }
}

const javaDir = 'android/app/src/main/java/com/clantb3st/app';
await mkdir(javaDir, { recursive: true });
const pluginTemplate = await readFile('scripts/ApkUpdaterPlugin.java', 'utf8');
await writeFile(javaDir + '/ApkUpdaterPlugin.java', pluginTemplate);

const activityPath = javaDir + '/MainActivity.java';
let activity = await readFile(activityPath, 'utf8');
if (!activity.includes('registerPlugin(ApkUpdaterPlugin.class)')) {
  const onCreate = `
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
        setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);
    }
`;
  if (!activity.includes('public class MainActivity extends BridgeActivity')) {
    throw new Error('Unexpected MainActivity template; cannot register ApkUpdaterPlugin safely.');
  }
  activity = activity.replace(/public class MainActivity extends BridgeActivity\s*\{/, match => match + onCreate);
  await writeFile(activityPath, activity);
}

const versionCode = Number(process.env.ANDROID_VERSION_CODE || process.env.GITHUB_RUN_NUMBER || 1);
if (!Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error('Invalid Android versionCode.');
const gradlePath = 'android/app/build.gradle';
let gradle = await readFile(gradlePath, 'utf8');
if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+["'][^"']+["']/.test(gradle)) {
  throw new Error('Could not locate Android versionCode/versionName in app/build.gradle.');
}
gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
gradle = gradle.replace(/versionName\s+["'][^"']+["']/, 'versionName "1.0.' + versionCode + '"');
await writeFile(gradlePath, gradle);

if (!manifest.includes('android:scheme="com.clantb3st.app"')) {
  const deepLink = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.clantb3st.app" android:host="auth-callback" />
            </intent-filter>`;
  if (!manifest.includes('</activity>')) throw new Error('No Android activity found in AndroidManifest.xml');
  manifest = manifest.replace('</activity>', `${deepLink}
        </activity>`);
}
await writeFile(manifestPath, manifest);
console.log('Android auth deep link and signed APK updater configured.');
