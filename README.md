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

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have [Node.js](https://nodejs.org/en/) (version 20.x or higher) and npm installed on your computer.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```

2.  **Install NPM packages:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables for Local Development:**
    Create a file named `.env.local` in the root of your project and add the following variables.

    ```env
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
    NEXT_PUBLIC_GOOGLE_MAPS_ID=YOUR_GOOGLE_MAPS_ID
    ```

### Running the Development Server

To run the app in development mode, execute the following command:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Deployment with Firebase App Hosting

This application is configured for easy deployment with **Firebase App Hosting**. When you push to your `master` branch, App Hosting automatically builds and deploys your app based on the `apphosting.yaml` file.

### Deployment Troubleshooting & Required Steps

If your map shows an API key error or the build fails with a "Misconfigured secret" error, **you must complete the two steps below**.

**Step 1 (Required): Create the Deployment Secret**

The error `Error resolving secret version with name=.../secrets/GOOGLE_MAPS_API_KEY/...` means you have not created the required secret in your Firebase project. This is **not a GitHub secret**.

1.  Go to your Firebase project: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  In the left menu, go to **Build > App Hosting**.
3.  Select your backend (it should be named **profinder**).
4.  Go to the **Settings** tab.
5.  Click on the **Environment** section.
6.  You will be prompted for an "Environment name". Type `prod` and click the **Save** button.
7.  The page will reload. Now, you will see an **Add secret** button. Click it.
8.  For the **Secret name**, enter **exactly** `GOOGLE_MAPS_API_KEY`.
9.  For the **Secret value**, paste your actual Google Maps API key.
10. Click **Create and Deploy**. This will trigger a new build that should now succeed.

**Step 2 (Required): Delete the Old GitHub Workflow File**

This project uses `apphosting.yaml` and does not need a GitHub Actions workflow file. An old, conflicting workflow file (`firebase-hosting.yml`) may be causing deployment errors. **You must delete it.**

1.  Go to your repository on GitHub.
2.  Navigate to the `.github/workflows/` directory.
3.  Delete the `firebase-hosting.yml` file if it exists.
4.  Commit the deletion.

After completing these two steps and pushing the latest code, your deployment will succeed.
