# QueueSense

QueueSense is a responsive hospital queue management application for patients, doctors, and administrators. It combines symptom-based specialist routing, live queue estimates, consultation tracking, emergency prioritisation, and downloadable reports in one focused workspace.

## What It Does

### Patient journey

1. Sign in as a patient.
2. Enter the patient's name and describe the disease, symptoms, or medical concern.
3. QueueSense analyses the description, identifies the most relevant department, and assigns one available specialist automatically.
4. Follow the live queue position and estimated waiting time from the patient dashboard.
5. After the consultation, view the diagnosis, clinical notes, medicines, duration, and download a personal PDF report.

Patients cannot choose a different specialist after triage, and patient records are filtered by the authenticated account.

### Doctor workspace

Doctors see the queue assigned to their own profile, start and end consultations, track consultation duration, mark no-shows, and insert emergency patients. Ending a consultation opens a clinical report form for diagnosis, notes, and prescribed medicines.

### Administrator workspace

Administrators can check in walk-in patients, monitor every doctor queue, reassign patients, apply or remove emergency priority, inspect queue events, and download separate doctor and patient operations reports as PDFs.

### Public queue display

The queue display is designed for a waiting-room screen. It shows doctor availability, queue totals, emergency priority, and current queue progress without exposing private consultation notes.

## Technology

- React 18 and TypeScript
- Vite
- Tailwind CSS and shadcn-style UI primitives
- Firebase Authentication and Cloud Firestore
- Recharts for operational visualisations
- jsPDF and jspdf-autotable for PDF reports
- Lucide React icons

## Requirements

- Node.js 18 or newer
- npm 9 or newer
- A Firebase project if persistent cloud data is required

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. The production build can be checked with:

```bash
npm run build
```

Other useful commands:

```bash
npm run lint
npm run typecheck
npm run preview
```

## Deploy On Render

QueueSense is a client-side Vite application and should be deployed as a Render **Static Site**.

### Blueprint deployment

The repository includes `render.yaml`. In Render, choose **New +**, select **Blueprint**, and connect the repository. Render will use the manifest to run `npm ci && npm run build`, publish `dist`, and rewrite every route to `index.html` so React Router works after refresh.

### Manual Static Site deployment

Use these values if creating the service manually:

| Setting | Value |
| --- | --- |
| Root directory | `project` if the repository contains this folder; otherwise leave blank |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Node version | `20` or newer |

If you created a Render **Web Service** instead of a Static Site, use `npm ci && npm run build` as the build command and `npm start` as the start command. The start script serves the generated `dist` directory on Render's assigned port. A Static Site does not need a start command; use the included `render.yaml` to avoid this error.

Add the seven `VITE_FIREBASE_*` variables from `.env.example` under Render's **Environment** settings. Vite embeds these values during the build, so redeploy after changing them. Do not add `.env`, `.env.local`, or service-account JSON files to the repository.

### Firebase production checklist

1. Add the Render deployment domain to Firebase Authentication **Authorized domains**.
2. Enable the sign-in providers used by the login screen.
3. Deploy `firestore.rules` and confirm the production users have the expected role fields.
4. Create the doctor documents required for specialist assignment in the `doctors` collection.
5. Confirm the deployed site can sign in, create a patient check-in, and receive Firestore updates.

Render hosts the frontend only. Firebase Authentication and Firestore remain the live backend services, so no Render server or database is required.

## Build A Local Android APK

The Android wrapper is generated with Capacitor and uses the same Vite production bundle as the web app. Android Studio, a configured Android SDK, and JDK 17 are required to assemble an APK. Java 25 is not currently supported by the generated Android Gradle toolchain.

From the `project` directory, run:

```bash
npm install
npm run android:apk
```

On Windows, install Android Studio with the Android SDK and install a JDK 17 distribution. Set `JAVA_HOME` to the JDK 17 folder, reopen the terminal, and verify it with `java -version` before running the APK command.

The debug APK will be created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To open the native project in Android Studio:

```bash
npm run build
npx cap sync android
npx cap open android
```

For a physical Android device, enable Developer Options and USB debugging, connect the device, and run the app from Android Studio. For release distribution, create a signing key in Android Studio and use a signed release build; do not distribute the debug APK as a production release.

The mobile app still uses Firebase for authentication and Firestore, so configure the same `VITE_FIREBASE_*` values before running `npm run android:apk`. Add the production web domain to Firebase Authentication authorized domains when using hosted web login; native Firebase authentication may additionally require Android app registration and SHA-1/SHA-256 fingerprints.

## Firebase Configuration

Create a `.env` file in the `project` directory using the variable names expected by `src/lib/firebase.ts`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Enable Email/Password, Google, and/or Phone Authentication in Firebase Authentication as needed. Deploy the rules in `firestore.rules` before using real patient data:

```bash
firebase deploy --only firestore:rules
```

When Firebase is not configured, the application uses the included demonstration data and local in-memory updates.

## Demo Accounts

The seeded demo users are defined in `src/lib/mockData.ts`:

| Role | Email | Name |
| --- | --- | --- |
| Patient | `patient@demo.com` | Demo Patient |
| Doctor | `doctor@demo.com` | Dr. Sarah Chen |
| Admin | `admin@demo.com` | Admin User |

Use the login screen's role selector with the matching seeded email when running the demonstration mode.

## Data and Privacy

Patients are linked through `userId` or `linkedPatientId`. Patient accounts receive only their own patient record from the application context. Firestore rules also restrict patient reads and writes to the authenticated patient or trusted staff roles. Doctors can see queue records needed for care, while administrators can manage operational data.

For a production deployment, use Firebase custom claims for staff roles, validate all report fields server-side, and avoid placing clinical data in public queue documents.

## Queue Logic

Specialist routing is driven by keyword-based symptom triage. The selected department is matched to an available doctor, then candidates are ranked by queue workload and their exponential moving average consultation time. Emergency cases are placed at the front of the assigned queue. Wait estimates update against the current clock while the patient is waiting.

## Project Structure

```text
src/
  components/       Shared layout and UI primitives
  context/          Authentication and live application state
  lib/              Firebase, queue, triage, formatting, and PDF utilities
  pages/            Patient, doctor, admin, login, queue, and report views
firestore.rules     Firestore access policy
```

## Notes for Contributors

- Keep queue calculations pure and testable in `src/lib/queueEngine.ts`.
- Keep role checks close to route-level pages and enforce sensitive access again in Firestore rules.
- Preserve mobile layouts: dashboards should remain usable at 320px wide.
- Keep report exports focused on the role downloading them.
- Do not commit `.env` files or Firebase credentials.