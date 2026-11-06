import { readFile, writeFile } from 'node:fs/promises';

const gradleFiles = [
  'android/app/build.gradle',
  'android/app/build.gradle.kts'
];

const envNames = [
  'ANDROID_KEYSTORE_PATH',
  'ANDROID_KEYSTORE_PASSWORD',
  'ANDROID_KEY_ALIAS',
  'ANDROID_KEY_PASSWORD'
];
for (const name of envNames) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

let target;
for (const path of gradleFiles) {
  try {
    await readFile(path, 'utf8');
    target = path;
    break;
  } catch {}
}
if (!target) throw new Error('Could not find android/app/build.gradle or build.gradle.kts');

let source = await readFile(target, 'utf8');
if (source.includes('signingConfigs.release') || source.includes('getByName("release")')) {
  throw new Error('Release signing appears to be configured already; refusing to duplicate it.');
}

if (target.endsWith('.kts')) {
  const signing = `
    signingConfigs {
        create("release") {
            storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH"))
            storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`;
  if (!source.includes('buildTypes {')) throw new Error('Could not find buildTypes block in Kotlin Gradle file');
  source = source.replace('buildTypes {', `${signing}\n    buildTypes {\n        getByName("release") {\n            signingConfig = signingConfigs.getByName("release")\n        }\n`);
} else {
  const signing = `
    signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
`;
  if (!source.includes('buildTypes {')) throw new Error('Could not find buildTypes block in Groovy Gradle file');
  source = source.replace('buildTypes {', `${signing}\n    buildTypes {\n        release {\n            signingConfig signingConfigs.release\n        }\n`);
}

await writeFile(target, source);
console.log(`Permanent release signing configured in ${target}.`);
