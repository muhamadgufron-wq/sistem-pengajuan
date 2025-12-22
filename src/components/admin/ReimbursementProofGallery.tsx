"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import ProofGallery from "@/components/reimbursement/ProofGallery";

interface ReimbursementProofGalleryProps {
  reimbursementId: number;
}

export default function ReimbursementProofGallery({ reimbursementId }: ReimbursementProofGalleryProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        console.log('Fetching proof files for reimbursement:', reimbursementId);
        const response = await fetch(`/api/reimbursement/${reimbursementId}/bukti`);
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Fetched files:', result);
          setFiles(result.data || []);
        } else {
          const error = await response.json();
          console.error('Error response:', error);
        }
      } catch (error) {
        console.error('Error fetching reimbursement proof files:', error);
      } finally {
        setLoading(false);
      }
    };

    if (reimbursementId) {
      fetchFiles();
    }
  }, [reimbursementId]);

  if (loading) {
    return <div className="text-center py-8">Memuat bukti...</div>;
  }

  return <ProofGallery files={files} />;
}
