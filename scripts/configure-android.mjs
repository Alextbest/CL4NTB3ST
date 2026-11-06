import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

if (!manifest.includes('com.clantb3st.app')) {
  const deepLink = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.clantb3st.app" android:host="auth-callback" />
            </intent-filter>`;
  manifest = manifest.replace(/(\\s*<\\/activity>)/, `${deepLink}$1`);
  await writeFile(manifestPath, manifest);
}

console.log('Android Supabase auth deep link configured.');
