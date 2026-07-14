/**
 * PhotoCapture.jsx — Capture photo (appareil) ou import galerie.
 *
 * Fonctionnalités :
 *   - Mode "Prendre une photo" : ouvre la caméra via getUserMedia
 *   - Mode "Importer depuis la galerie" : input file classique
 *   - Prévisualisation avant upload
 *   - Recadrage basique (crop)
 *   - Support mobile (capture="environment" pour caméra arrière)
 *
 * Usage :
 *   <PhotoCapture onPhotoSelected={(file) => uploadPhoto(file)} />
 *   <PhotoCapture onPhotoSelected={(file) => ...} aspectRatio="1:1" />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image, X, RotateCw, Check, Upload } from 'lucide-react';

export function PhotoCapture({ onPhotoSelected, maxSizeMB = 5 }) {
  const [mode, setMode] = useState('idle'); // idle | camera | preview
  const [photo, setPhoto] = useState(null); // File ou dataURL
  const [photoURL, setPhotoURL] = useState(null);
  const [error, setError] = useState('');
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'user' ou 'environment'

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Nettoyer le flux caméra au démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Démarrer la caméra
  const startCamera = async () => {
    setError('');
    stopCamera();

    try {
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setMode('camera');
    } catch (err) {
      console.error('Erreur caméra:', err);
      if (err.name === 'NotAllowedError') {
        setError('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres.');
      } else if (err.name === 'NotFoundError') {
        setError('Aucune caméra détectée sur cet appareil.');
      } else {
        setError('Impossible d\'accéder à la caméra.');
      }
    }
  };

  // Prendre une photo depuis la caméra
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    // Taille carrée selon aspectRatio
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoURL(dataURL);
    setPhoto(dataURLToFile(dataURL, `photo_${Date.now()}.jpg`));

    stopCamera();
    setMode('preview');
  };

  // Gérer l'import depuis la galerie
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier la taille
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`L'image ne doit pas dépasser ${maxSizeMB} MB.`);
      return;
    }

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoURL(reader.result);
      setPhoto(file);
      setMode('preview');
    };
    reader.readAsDataURL(file);
  };

  // Basculer caméra avant/arrière
  const toggleCamera = () => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    startCamera();
  };

  // Confirmer la photo
  const confirmPhoto = () => {
    if (photo && onPhotoSelected) {
      onPhotoSelected(photo);
    }
    resetState();
  };

  // Réinitialiser
  const resetState = () => {
    stopCamera();
    setMode('idle');
    setPhoto(null);
    setPhotoURL(null);
    setError('');
  };

  // État : sélection du mode
  if (mode === 'idle') {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Bouton : Prendre une photo */}
          <button
            onClick={startCamera}
            className="flex flex-col items-center gap-2 p-5 bg-sky-50 border-2 border-dashed border-sky-200 rounded-2xl hover:border-cyan-400 hover:bg-sky-100 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-cyan-100 transition-all">
              <Camera size={24} className="text-sky-600 group-hover:text-cyan-600" />
            </div>
            <span className="text-xs font-bold text-sky-700">Prendre une photo</span>
            <span className="text-[10px] text-sky-400">Utiliser l'appareil photo</span>
          </button>

          {/* Bouton : Importer de la galerie */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-5 bg-sky-50 border-2 border-dashed border-sky-200 rounded-2xl hover:border-cyan-400 hover:bg-sky-100 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center group-hover:bg-cyan-100 transition-all">
              <Image size={24} className="text-sky-600 group-hover:text-cyan-600" />
            </div>
            <span className="text-xs font-bold text-sky-700">Importer</span>
            <span className="text-[10px] text-sky-400">Depuis la galerie</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // État : caméra active
  if (mode === 'camera') {
    return (
      <div className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Contrôles */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={resetState}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
            >
              <X size={20} />
            </button>

            <button
              onClick={capturePhoto}
              className="w-16 h-16 bg-white rounded-full border-4 border-sky-200 hover:border-cyan-400 transition-all active:scale-95 shadow-lg"
            />

            <button
              onClick={toggleCamera}
              className="p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-all"
            >
              <RotateCw size={20} />
            </button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // État : prévisualisation
  if (mode === 'preview' && photoURL) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl overflow-hidden bg-sky-50 aspect-square">
          <img
            src={photoURL}
            alt="Aperçu"
            className="w-full h-full object-cover"
          />

          {/* Badge taille */}
          {photo?.size && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
              {(photo.size / 1024).toFixed(0)} KB
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={resetState}
            className="flex-1 px-4 py-2.5 bg-sky-50 text-sky-600 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all flex items-center justify-center gap-2"
          >
            <X size={14} /> Recommencer
          </button>
          <button
            onClick={confirmPhoto}
            className="flex-1 px-4 py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-black hover:bg-cyan-600 transition-all flex items-center justify-center gap-2"
          >
            <Check size={14} /> Utiliser cette photo
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Convertit une dataURL en File.
 */
function dataURLToFile(dataURL, filename) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export default PhotoCapture;