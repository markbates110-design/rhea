"use client";

interface MealPhotoPickButtonsProps {
  idPrefix: string;
  disabled?: boolean;
  onPick: (fileList: FileList | null) => void;
  /** Shorter labels when replacing an existing photo */
  variant?: "add" | "replace";
}

const labelClass = (disabled: boolean) =>
  `inline-flex cursor-pointer items-center gap-xs rounded-xl border border-outline-variant bg-surface-container px-md py-xs font-label-sm text-label-sm text-on-surface transition-colors hover:border-primary hover:bg-surface-container-high ${
    disabled ? "pointer-events-none opacity-40" : ""
  }`;

/**
 * Mobile browsers treat `capture` and non-capture file inputs differently —
 * one input cannot reliably offer both camera and gallery. Two inputs, two
 * buttons, same onPick handler.
 */
export function MealPhotoPickButtons({
  idPrefix,
  disabled = false,
  onPick,
  variant = "add",
}: MealPhotoPickButtonsProps) {
  const cameraId = `${idPrefix}-camera`;
  const galleryId = `${idPrefix}-gallery`;

  function handleChange(fileList: FileList | null, input: HTMLInputElement) {
    onPick(fileList);
    input.value = "";
  }

  const cameraLabel = variant === "add" ? "Take photo" : "Retake";
  const galleryLabel = variant === "add" ? "Choose from gallery" : "From gallery";

  return (
    <div className="flex flex-wrap gap-xs">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        id={cameraId}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.files, e.target)}
      />
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        id={galleryId}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.files, e.target)}
      />
      <label htmlFor={cameraId} className={labelClass(disabled)}>
        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
        {cameraLabel}
      </label>
      <label htmlFor={galleryId} className={labelClass(disabled)}>
        <span className="material-symbols-outlined text-[18px]">photo_library</span>
        {galleryLabel}
      </label>
    </div>
  );
}
