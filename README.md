# Profinder

Profinder is a professional social networking platform designed to help you connect, collaborate, and grow with professionals and traders in your vicinity. Discover skilled individuals, engage in meaningful conversations, and unlock new opportunities—all in one place....

## Key Features

- **User Discovery:** Browse a list of professionals, filter by profession, location, and online status.
- **Interactive Map View:** See who's online and nearby on a real-time map powered by Leaflet and OpenStreetMap.
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
- **Map:** [Leaflet](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles

## Deployment with Firebase App Hosting

This application is configured for easy deployment with **Firebase App Hosting**. When you push to your `master` branch, App Hosting automatically builds and deploys your app based on the `apphosting.yaml` file.

---

## Troubleshooting Common Errors

### Issue 1: "accounts.google.com refused to connect" or Google Sign-In popup closes immediately

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

