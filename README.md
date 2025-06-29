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

3.  **Set up Environment Variables:**
    Create a file named `.env.local` in the root of your project and add the following variables. You'll need to get these from your Google Cloud project.

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

## Deployment

This application is configured for easy deployment with [Firebase App Hosting](https://firebase.google.com/docs/app-hosting).
