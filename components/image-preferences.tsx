import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { defaultImagePreferences, readImagePreferences, type ImageDisplay, type ImagePreferences, type ImageSize } from "@/lib/image-links";

export function useImagePreferences() {
  const [preferences, setPreferences] = useState<ImagePreferences>(defaultImagePreferences);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try { setPreferences(readImagePreferences(localStorage.getItem("chatptt-image-preferences"), localStorage.getItem("chatptt-images"))); } catch { setSaved(false); }
  }, []);
  function change(next: ImagePreferences) {
    setPreferences(next);
    try { localStorage.setItem("chatptt-image-preferences", JSON.stringify(next)); setSaved(true); } catch { setSaved(false); }
  }
  return { preferences, change, saved };
}

export function ImagePreferenceFields({ value, onChange, disabled = false }: { value: ImagePreferences; onChange: (next: ImagePreferences) => void; disabled?: boolean }) {
  return <>
    <label>圖片顯示<select aria-label="圖片顯示方式" value={value.display} disabled={disabled} onChange={e => onChange({ ...value, display: e.target.value as ImageDisplay })}>
      <option value="links">只看連結</option><option value="inline">顯示在文章中</option><option value="floating">浮動小視窗</option>
    </select></label>
    <label>預設大小<select aria-label="預設圖片大小" value={value.size} disabled={disabled} onChange={e => onChange({ ...value, size: e.target.value as ImageSize })}>
      <option value="small">小</option><option value="medium">中</option><option value="large">大</option>
    </select></label>
  </>;
}

export function ImageSettingsDialog({ open, onOpenChange, value, onChange, saved }: { open: boolean; onOpenChange: (open: boolean) => void; value: ImagePreferences; onChange: (next: ImagePreferences) => void; saved: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogTitle>圖片設定</DialogTitle>
    <DialogDescription className="dialog-copy">選擇平常看圖的方式。設定會套用到文章內文與推文，並記在這個瀏覽器。</DialogDescription>
    <div className="image-settings-fields"><ImagePreferenceFields value={value} onChange={onChange}/></div>
    <p className="image-settings-note">浮動小視窗只顯示一張圖片，可用上一張／下一張切換。拖曳標題列可移動，拖曳角落可調整寬高；小／中／大按鈕可恢復預設尺寸。工作模式會隱藏所有圖片。</p>
    <p className="image-settings-status" role="status">{saved ? "自動儲存，下次開啟仍會套用" : "瀏覽器無法儲存設定，本次開啟仍可使用"}</p>
  </DialogContent></Dialog>;
}
