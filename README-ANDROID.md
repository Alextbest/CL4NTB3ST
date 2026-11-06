# CL4N TB3ST — Android APK

The Android wrapper uses Capacitor and packages the existing web interface into the app. The native build runs in GitHub Actions; no production Netlify deployment is required.

## Build

1. Push changes to `feature/android-apk-capacitor`.
2. Open the repository's **Actions** tab.
3. Select **Build Android APK** and wait for the build to finish.
4. Download the `CL4N-TB3ST-debug-apk` artifact from the completed run.

The debug APK is suitable for installation/testing by clan members. A signed release APK/AAB requires a private Android signing key; never commit that key or its passwords.

## App identity

- Name: CL4N TB3ST
- Android application ID: `com.clantb3st.app`
- Icon and launch screen source: existing repository `logo.png`, converted into 1024px source artwork and Android launcher/splash variants during the build.

## Notes

The APK contains the web interface locally. Supabase remains the online authentication/backend service. Email confirmation deep links still need to be configured and tested before distributing the APK as the main login app.
