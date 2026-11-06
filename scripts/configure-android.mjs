import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

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
  await writeFile(manifestPath, manifest);
}

console.log('Android Supabase auth deep link configured.');
