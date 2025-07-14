# Profinder

Profinder is a professional social networking platform designed to help you connect, collaborate, and grow with professionals and traders in your vicinity. Discover skilled individuals, engage in meaningful conversations, and unlock new opportunities—all in one place.

## Key Features

- **User Discovery:** Browse a list of professionals, filter by profession, location, and online status.
- **Interactive Map View:** See who's online and nearby on a real-time map, with privacy controls.
- **Public Profiles:** View detailed user profiles including their profession, experience, bio, and contact information (if shared).
- **Real-time Messaging:** Start one-on-one conversations with other users with in-app chat.
- **Favorites System:** Keep a list of your favorite professionals for easy access.
- **Secure Authentication:** Complete email/password and Google login flow with email verification.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://reactjs.org/), [ShadCN UI](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database:** [Firebase](https://firebase.google.com/) (Authentication, Firestore, Storage)
- **Generative AI:** [Genkit](https://firebase.google.com/docs/genkit) (for future AI features)

## Deployment with Firebase App Hosting

This application is configured for easy deployment with **Firebase App Hosting**. When you push to your `master` branch, App Hosting automatically builds and deploys your app based on the `apphosting.yaml` file.

---

## Troubleshooting Common Deployment Issues

### Issue 1: Map shows markers but no map background (blank map)

If your deployed app shows user markers on a blank gray map, it means your Google Maps API Key is not configured to work on your new website URL.

**Solution: Add a wildcard URL to the API Key restrictions.**

This is the most common deployment issue. The key is to use a wildcard (`*.`) to ensure all subdomains of your app are authorized.

1.  **Go to Google Cloud Console:** Open the API Credentials page: [https://console.cloud.google.com/google/maps-apis/credentials](https://console.cloud.google.com/google/maps-apis/credentials)
2.  **Select your Project:** Make sure your project (`profinder-90fe7`) is selected at the top of the page.
3.  **Click on your API Key:** Find the key you are using (check your `apphosting.yaml` secret name) and click its name to edit it.
4.  **Find "Application restrictions":** Scroll down to this section. Make sure **"Websites"** is selected.
5.  **Click "ADD":** Under "Website restrictions", click the **"ADD"** button.
6.  **Enter the Wildcard URL:** In the new field, type this exactly:
    `*.profinder-90fe7.us-central1.hosted.app`
    *(Using `*.` at the start is the key part of this fix.)*
7.  **Save your changes:** Click the "Save" button at the bottom.

The changes can take up to 5 minutes to take effect. After waiting, refresh your deployed app page, and the map should appear correctly.

### Issue 2: Build fails with "Misconfigured secret" or "Invalid apphosting.yaml"

If your build fails, you must complete the two steps below.

**Step 1 (Required): Delete the Old GitHub Workflow File**

This project uses `apphosting.yaml` and does not need a GitHub Actions workflow file. An old, conflicting workflow file (`firebase-hosting.yml`) may be causing deployment errors. **You must delete it.**

1.  Go to your repository on GitHub.
2.  Navigate to the `.github/workflows/` directory.
3.  Delete the `firebase-hosting.yml` file if it exists.
4.  Commit the deletion.

**Step 2 (Required): Create the Deployment Secret (CLI Method - Recommended)**

The error `Error resolving secret version with name=.../secrets/GOOGLE_MAPS_API_KEY/...` means you have not created the required secret in your Firebase project. This is **not a GitHub secret**. The recommended way to fix this is with the Firebase Command Line Interface (CLI), which bypasses any issues with the web console.

First, make sure you have the Firebase CLI installed (`npm install -g firebase-tools`) and are logged in (`firebase login`).

1.  **Set the Secret:**
    Run the following command in your terminal. It will securely prompt you to enter the key value.
    ```bash
    firebase apphosting:secrets:set GOOGLE_MAPS_API_KEY --project profinder-90fe7
    ```

2.  **Grant Access to the Backend:**
    Run this command to give your `profinder` backend permission to use the secret.
     ```bash
    firebase apphosting:secrets:grantaccess GOOGLE_MAPS_API_KEY --backend profinder --project profinder-90fe7
    ```
    
3.  **Trigger a New Deployment:**
    Push a small change to your repository to start a new build.

After completing these two steps and pushing the latest code, your deployment will succeed.
