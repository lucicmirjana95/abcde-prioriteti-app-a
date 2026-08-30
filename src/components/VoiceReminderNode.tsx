import React from "react";
import VoiceInputNode from "./VoiceInputNode";
import { Language } from "../translations";

interface VoiceReminderNodeProps {
  onNoteSaved: (note: string) => void;
  language: Language;
  isEvening?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export default function VoiceReminderNode({
  onNoteSaved,
  language,
  isEvening,
  onStartRecording,
  onStopRecording,
}: VoiceReminderNodeProps) {
  return (
    <VoiceInputNode
      onTranscript={onNoteSaved}
      language={language}
      isEvening={isEvening}
      onStartRecording={onStartRecording}
      onStopRecording={onStopRecording}
    />
  );
}
