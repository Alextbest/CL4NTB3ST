# CL4N TB3ST — Android APK

The Android app packages the interface locally with Capacitor. The APK is built by GitHub Actions; it does not require a Netlify production deployment or Netlify hosting.

## Build

1. Push changes to `feature/android-apk-capacitor`.
2. Open the repository's **Actions** tab.
3. Select **Build Android APK** and wait for the build to finish.
4. Download the `CL4N-TB3ST-signed-release-apk` artifact from the completed run.

The workflow produces a signed release APK and verifies its signature before publishing it. The signing key and passwords are stored only as GitHub Actions secrets; never commit them to the repository.

## App identity

- Name: CL4N TB3ST
- Android application ID: `com.clantb3st.app`
- Authentication callback: `com.clantb3st.app://auth-callback`

## Supabase Auth configuration

For an APK-only installation, configure **Supabase → Authentication → URL Configuration** as follows:

- **Site URL:** `com.clantb3st.app://auth-callback`
- **Redirect URLs:** include the exact URL `com.clantb3st.app://auth-callback`
- Remove the old Netlify URL from the allowed Redirect URLs after confirming the APK sign-in and email-confirmation flow.

The app passes this callback explicitly for email confirmation and password reset. Supabase remains the online authentication and database service; only the app interface is bundled into the APK.

## Hosting independence

- GitHub Actions builds and stores the APK artifact.
- Android loads the interface from the installed app package, not from Netlify.
- Supabase remains online and requires an internet connection.
- No Netlify deployment is part of the Android build workflow.

The APK is installed locally on Android. Supabase remains the cloud backend, so registration, login, and synchronized clan data require internet access.
