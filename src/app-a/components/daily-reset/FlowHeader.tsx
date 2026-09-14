import React from "react";
import GrowthPathArt from "../GrowthPathArt";

interface Props {
  eyebrow?: string;
  title: string;
  intro?: string;
  className?: string;
}

export default function FlowHeader({ eyebrow, title, intro, className = "" }: Props) {
  return (
    <header className={`app-a-flow-header ${className}`}>
      <GrowthPathArt variant="header" aria-hidden="true" />
      <div className="app-a-flow-header-inner">
        {eyebrow && <p className="app-a-flow-eyebrow">{eyebrow}</p>}
        <h1 className="app-a-flow-title">{title}</h1>
        {intro && <p className="app-a-flow-intro">{intro}</p>}
      </div>
    </header>
  );
}

