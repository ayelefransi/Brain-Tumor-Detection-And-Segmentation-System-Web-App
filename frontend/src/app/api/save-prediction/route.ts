export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, patientName, filename, metrics } = body;

    // Ensure profile exists to prevent foreign key constraint violations
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: user.user_metadata?.full_name || "Doctor",
        role: "DOCTOR",
      });
      if (profileError) {
        console.error("Profile auto-insert error:", profileError);
      }
    }

    // Find or create the patient
    let { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("patient_id", patientId)
      .single();

    if (!patient) {
      const { data: newPatient, error: patientError } = await supabase
        .from("patients")
        .insert({
          patient_id: patientId || "PT-00001",
          name: patientName || "Unknown Patient",
          age: 0,
          sex: "Unknown",
          user_id: user.id,
        })
        .select("id")
        .single();

      if (patientError) {
        console.error("Patient insert error:", patientError);
        return NextResponse.json({ error: patientError.message }, { status: 500 });
      }
      patient = newPatient;
    }

    // Save scan
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        modality: "MRI-T1ce",
        file_path: filename || "uploaded_scan.nii.gz",
        patient_id: patient!.id,
      })
      .select("id")
      .single();

    if (scanError) {
      console.error("Scan insert error:", scanError);
      return NextResponse.json({ error: scanError.message }, { status: 500 });
    }

    // Save prediction
    const { data: prediction, error: predError } = await supabase
      .from("predictions")
      .insert({
        volume_cm3: metrics.volume_cm3,
        confidence: metrics.confidence,
        tumor_type: metrics.type,
        metrics: metrics.metrics || {},
        segmentation_url: "local",
        scan_id: scan!.id,
      })
      .select()
      .single();

    if (predError) {
      console.error("Prediction insert error:", predError);
      return NextResponse.json({ error: predError.message }, { status: 500 });
    }

    return NextResponse.json({ status: "success", prediction });

  } catch (error: any) {
    console.error("Save Prediction Error:", error);
    return NextResponse.json({ error: error.message || "DB save failed" }, { status: 500 });
  }
}
