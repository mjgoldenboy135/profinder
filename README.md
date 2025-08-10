# Profinder

Profinder is a professional social networking platform designed to help you connect, collaborate, and grow with professionals and traders in your vicinity. Discover skilled individuals, engage in meaningful conversations, and unlock new opportunities—all in one place....

## Key Features

- **User Discovery:** Browse a list of professionals, filter by profession, location, and online status.
- **Interactive Map View:** See who's online and nearby on a real-time map, with privacy controls..
- **Public Profiles:** View detailed user profiles including their profession, experience, bio, and contact information (if shared)..
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

## Troubleshooting Common Errors

### Issue 1: Map shows markers but no map background (or fails with `RefererNotAllowedMapError`)

If your map is blank/gray, or if you see a `RefererNotAllowedMapError` in the browser console, it means your Google Maps API Key is not configured to work on your website's URL. This needs to be fixed for **both** your development environment and your final deployed site.

**Solution: Add your website URLs to the API Key's "Website restrictions".**

1.  **Go to Google Cloud Console:** Open the API Credentials page: [https://console.cloud.google.com/google/maps-apis/credentials](https://console.cloud.google.com/google/maps-apis/credentials)
2.  **Select your Project:** Make sure your project (`profinder-90fe7`) is selected at the top of the page.
3.  **Click on your API Key:** Find the key you are using for this app and click its name to edit it.
4.  **Select "Websites":** Under "Application restrictions", click the radio button for **"Websites"**.
5.  **Click "ADD":** Under "Website restrictions", click the **"ADD"** button to add the following entries one by one. **It is critical that you copy these exactly, including the `https://` and the `*` characters.**

    *   **For the Deployed Site (Most Important):**
        Add this exact URL to allow the map to work on your live website.
        ```
        https://*.profinder--profinder-90fe7.us-central1.hosted.app/*
        ```

    *   **For the Development Environment:**
        Add this exact URL to allow the map to work in your coding environment:
        ```
        https://*.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev/*
        ```
        
    *   **For Localhost (Optional but Recommended):**
        ```
        http://localhost:9002
        ```

    Your final configuration should look like this:
    ![Correct API Key Configuration](https://storage.googleapis.com/profinder-90fe7.appspot.com/correct_api_restrictions.png)

6.  **Save your changes:** Click the "Save" button at the bottom.

The changes can take up to 5 minutes to take effect. After waiting, refresh your app page, and the map should appear correctly in all environments.

### Issue 2: "accounts.google.com refused to connect" or Google Sign-In popup closes immediately

If the Google Sign-In window appears and then quickly disappears, or you see a "refused to connect" error in the console, it means your project's credentials are not authorized for your deployed website's URL.

**Solution: Add your website's URL to the Authorized JavaScript origins.**

1.  **Go to Google Cloud Credentials:** Open the Credentials page: [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2.  **Select your Project:** Make sure your project (`profinder-90fe7`) is selected at the top of the page.
3.  **Find your Web Client ID:** Under the "OAuth 2.0 Client IDs" section, find the client that is of type **"Web application"** and click on its name to edit it.
4.  **Add the Origin URI:**
    -   Look for the **"Authorized JavaScript origins"** section.
    -   Click the **"+ ADD URI"** button.
    -   In the new field that appears, enter your app's full URL exactly as follows:
        `https://profinder--profinder-90fe7.us-central1.hosted.app`
5.  **Save your changes:** Scroll down and click the "SAVE" button.

### Issue 3: Build fails with "Misconfigured secret"

The error `Error resolving secret version with name=.../secrets/GOOGLE_MAPS_API_KEY/...` means you have not created the required secret in your Firebase project.

**Solution: Create the secret using the Firebase CLI.**

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
