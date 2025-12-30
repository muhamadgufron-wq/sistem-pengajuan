"use client";
import LoadingSpinner from "@/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[50vh] w-full">
      <LoadingSpinner />
    </div>
  );
}
