import { useState } from 'react';
export function useCamera() { const [isRecording, setIsRecording] = useState(false); const [isImmersive, setIsImmersive] = useState(false); return { isRecording, setIsRecording, isImmersive, setIsImmersive }; }
