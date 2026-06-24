export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const patientId = formData.get("patientId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward the file to the FastAPI backend
    const fastApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const backendResponse = await fetch(`${fastApiUrl}/api/predict`, {
      method: "POST",
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend error: ${backendResponse.statusText}`);
    }

    const predictionData = await backendResponse.json();

    // Find or create the patient
    let patient = await prisma.patient.findUnique({
      where: { patientId: patientId || "PT-88392" }
    });

    if (!patient) {
      let user = await prisma.user.findFirst();
      if (!user) {
         user = await prisma.user.create({
             data: { email: "doctor@neuroscan.com", name: "Dr. Smith", role: "DOCTOR" }
         });
      }
      
      patient = await prisma.patient.create({
        data: {
          patientId: patientId || "PT-88392",
          name: "Elias Jenkins",
          age: 45,
          sex: "M",
          userId: user.id
        }
      });
    }

    const targetPatientId = patient.id; // Get the actual cuid primary key

    // Save scan
    const scan = await prisma.scan.create({
      data: {
        modality: "MRI-T1ce", // Or extract from file
        filePath: predictionData.filename || "uploaded_scan.nii.gz",
        patientId: targetPatientId,
      }
    });

    // Save prediction
    const prediction = await prisma.prediction.create({
      data: {
        volumeCm3: predictionData.metrics.volume_cm3,
        confidence: predictionData.metrics.confidence,
        tumorType: predictionData.metrics.type,
        metrics: JSON.stringify(predictionData.metrics.metrics),
        segmentationUrl: predictionData.segmentation_mask_url,
        scanId: scan.id
      }
    });

    return NextResponse.json({
      status: "success",
      prediction: {
        ...prediction,
        images: predictionData.metrics.images
      },
      scan
    });

  } catch (error: any) {
    console.error("Prediction API Error:", error);
    return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
  }
}
