export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, filename, metrics } = body;

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

    // Save scan
    const scan = await prisma.scan.create({
      data: {
        modality: "MRI-T1ce",
        filePath: filename || "uploaded_scan.nii.gz",
        patientId: patient.id,
      }
    });

    // Save prediction
    const prediction = await prisma.prediction.create({
      data: {
        volumeCm3: metrics.volume_cm3,
        confidence: metrics.confidence,
        tumorType: metrics.type,
        metrics: JSON.stringify(metrics.metrics),
        segmentationUrl: "local",
        scanId: scan.id
      }
    });

    return NextResponse.json({ status: "success", prediction });

  } catch (error: any) {
    console.error("Save Prediction Error:", error);
    return NextResponse.json({ error: error.message || "DB save failed" }, { status: 500 });
  }
}
