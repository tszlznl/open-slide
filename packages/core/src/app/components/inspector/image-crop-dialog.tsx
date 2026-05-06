import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLocale } from '@/lib/use-locale';

export type ImageCropResult = {
  fit: 'cover' | 'contain';
  x: number;
  y: number;
};

export function ImageCropDialog({
  src,
  targetWidth,
  targetHeight,
  initialFit,
  initialPosition,
  onClose,
  onApply,
}: {
  src: string;
  targetWidth: number;
  targetHeight: number;
  initialFit: 'cover' | 'contain';
  initialPosition: { x: number; y: number };
  onClose: () => void;
  onApply: (result: ImageCropResult) => void;
}) {
  const t = useLocale();
  const [fit, setFit] = useState<'cover' | 'contain'>(initialFit);
  const aspect = targetWidth > 0 && targetHeight > 0 ? targetWidth / targetHeight : 1;
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    setCrop(makeMaxSizeCrop(im.naturalWidth, im.naturalHeight, aspect, initialPosition));
  };

  useEffect(() => {
    const im = imgRef.current;
    if (!im || !im.complete || !im.naturalWidth || !im.naturalHeight) return;
    setCrop((prev) => {
      const pos = prev ? deriveObjectPosition(prev as PercentCrop) : initialPosition;
      return makeMaxSizeCrop(im.naturalWidth, im.naturalHeight, aspect, pos);
    });
  }, [aspect, initialPosition]);

  const onApplyClick = () => {
    if (fit === 'contain') {
      onApply({ fit, x: 50, y: 50 });
      return;
    }
    const pos =
      crop && crop.unit === '%' ? deriveObjectPosition(crop as PercentCrop) : { x: 50, y: 50 };
    onApply({ fit, x: round2(pos.x), y: round2(pos.y) });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.inspector.cropDialogTitle}</DialogTitle>
          <DialogDescription>{t.inspector.cropDialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          <ToggleGroup
            type="single"
            value={fit}
            onValueChange={(v) => {
              if (v === 'cover' || v === 'contain') setFit(v);
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="cover" className="text-xs">
              {t.inspector.cropFitCover}
            </ToggleGroupItem>
            <ToggleGroupItem value="contain" className="text-xs">
              {t.inspector.cropFitContain}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex h-[420px] w-full items-center justify-center overflow-hidden rounded-md border bg-[repeating-conic-gradient(theme(colors.muted)_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
          {fit === 'cover' ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={aspect}
              keepSelection
              locked
              className="max-h-full"
            >
              <img
                ref={imgRef}
                src={src}
                alt=""
                style={{ maxHeight: 420, maxWidth: '100%' }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          ) : (
            <img src={src} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={onApplyClick}>{t.inspector.cropApply}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function makeMaxSizeCrop(
  naturalW: number,
  naturalH: number,
  aspect: number,
  position: { x: number; y: number },
): PercentCrop {
  if (naturalW <= 0 || naturalH <= 0) {
    return { unit: '%', x: 0, y: 0, width: 100, height: 100 };
  }
  const sourceAspect = naturalW / naturalH;
  let width = 100;
  let height = 100;
  if (aspect >= sourceAspect) {
    width = 100;
    height = (sourceAspect / aspect) * 100;
  } else {
    height = 100;
    width = (aspect / sourceAspect) * 100;
  }
  const slackX = 100 - width;
  const slackY = 100 - height;
  const x = clamp((position.x / 100) * slackX, 0, slackX);
  const y = clamp((position.y / 100) * slackY, 0, slackY);
  return { unit: '%', x, y, width, height };
}

function deriveObjectPosition(crop: PercentCrop): { x: number; y: number } {
  const slackX = 100 - crop.width;
  const slackY = 100 - crop.height;
  return {
    x: slackX > 0 ? clamp((crop.x / slackX) * 100, 0, 100) : 50,
    y: slackY > 0 ? clamp((crop.y / slackY) * 100, 0, 100) : 50,
  };
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
