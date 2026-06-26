# Brain Tumor Detection: Web App to Flutter Conversion Guide

## 🧠 What the Current Web App Does
The Brain Tumor Detection & Segmentation System is a full-stack medical AI application. Its core workflow is:
1. **File Upload:** The user interface allows dragging and dropping medical MRI scans (in NIfTI format: `.nii` or `.nii.gz`).
2. **Inference & Processing:** The frontend sends the scan to a Python FastAPI backend. The backend uses a 3D Attention U-Net model (built with PyTorch and MONAI) to process the scan.
3. **Analysis:** The AI model performs 3D brain tumor segmentation and classifies the tumor type (e.g., LGG vs. HGG).
4. **Visualization:** The Next.js frontend receives the data and displays tumor volume metrics, classification probabilities, and renders an interactive 3D representation of the brain/tumor using React Three Fiber.
5. **Data Persistence & Auth:** Users sign up/login via Supabase Auth, and prediction histories are saved in a Supabase Postgres database.

---

## 📱 How to Convert it into a Flutter App
To convert this web app into a native Flutter application for iOS and Android, you only need to replace the frontend. The Python FastAPI backend and Supabase database remain exactly the same.

1. **Rebuild the UI:** Build the dashboard, upload screens, and metrics displays using Flutter widgets (like `Container`, `Column`, `Card`) instead of Next.js, React, and Tailwind CSS.
2. **API Communication:** Replace the Next.js API routes with Flutter HTTP calls. Use packages like `http` or `dio` to send the `.nii` files as `multipart/form-data` to your existing FastAPI endpoints.
3. **Handling File Selection:** Use the `file_picker` package in Flutter to allow users to browse their phone's storage and select NIfTI medical scans.
4. **3D Visualization:** Flutter's native 3D support is different from Three.js. You have two choices:
   - **Native 3D Packages:** Use packages like `model_viewer_plus` or `flutter_3d_controller` if your backend can return a standard 3D format like `.glb` or `.obj`.
   - **WebView Bridge:** Use `webview_flutter` to load a lightweight HTML page that runs your existing React Three Fiber code inside the Flutter app.
5. **Local Storage:** Replace Prisma with a Flutter local database solution like `sqflite` (SQLite for Flutter) or `hive` to save prediction history on the user's device.

---

## 📝 Detailed Prompt for an LLM or Developer
*Copy and paste the prompt below into an LLM (like Claude, ChatGPT, or Gemini) or provide it to a developer to start building your Flutter app.*

***

**Prompt:**

> "I have an existing web application for 3D Brain Tumor Detection and Segmentation and I want to convert its frontend into a cross-platform mobile app using Flutter. 
> 
> **System Architecture:**
> - **Current Frontend:** Next.js, React, TailwindCSS, React Three Fiber (for 3D visualization).
> - **Backend:** Python FastAPI running a PyTorch/MONAI 3D Attention U-Net model. This backend exposes REST endpoints (e.g., for uploading `.nii` files and returning JSON predictions). **The backend will remain completely unchanged.**
> 
> **Core Flutter App Requirements:**
> 1. **File Upload Interface:** Create a screen where the user can select medical scan files (NIfTI format: `.nii`, `.nii.gz`) from their device storage using the `file_picker` package.
> 2. **API Integration:** Use the `dio` or `http` package to send the selected file as a `multipart/form-data` POST request to my existing FastAPI endpoint (`/predict`). Handle loading states gracefully (show a progress indicator), as 3D inference takes time.
> 3. **Results Dashboard:** Once the API returns the JSON result, display a clean dashboard showing:
>    - Tumor classification probabilities (e.g., LGG vs HGG) using visually appealing charts or progress bars.
>    - Extracted tumor volume metrics (in mm³ or cm³).
> 4. **3D Visualization:** Implement a 3D viewer component to display the tumor. Please suggest the best approach (e.g., using `model_viewer_plus` or rendering a `webview_flutter` that hosts a Three.js canvas) and provide the implementation code for the viewer.
> 5. **Auth & Database:** Implement user authentication (Sign Up / Login) using the `supabase_flutter` package. Retrieve prediction history directly from the Supabase Postgres database so users can view their past scans across devices.
> 
> **Design Guidelines:**
> - Use a modern, clean medical UI theme (e.g., soft blues, purples, and whites) following Material Design 3 guidelines.
> - Ensure the layout is responsive for both mobile phones and tablets.
> 
> **Deliverables needed:**
> Please provide the optimal `pubspec.yaml` dependencies, the directory structure for the Flutter project, and the core Dart code for the Upload Screen, the API Service class, and the Results Dashboard."
