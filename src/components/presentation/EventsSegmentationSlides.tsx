import React from "react";
import { PresentationSlide } from "./PresentationSlide";
import { Activity, Users, Target } from "lucide-react";

interface EventDefinition {
  name: string;
  description: string;
  category: string;
  properties: string[];
  useCases: string[];
}

interface SegmentDefinition {
  name: string;
  description: string;
  events: string[];
  conditions: string[];
  targetingUse: string;
}

interface EventsSegmentationSlidesProps {
  events: EventDefinition[];
  segments: SegmentDefinition[];
  industry: string;
}

export const EventsSegmentationSlides: React.FC<EventsSegmentationSlidesProps> = ({
  events,
  segments,
  industry,
}) => {
  // Group events by category
  const eventsByCategory = events.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, EventDefinition[]>);

  return (
    <div className="space-y-6">
      {/* Slide 1: Events Overview */}
      <PresentationSlide
        title="Recommended Events"
        subtitle={`Key events for ${industry} implementation`}
        slideNumber={1}
        footer="Events & Segmentation"
      >
        <div className="h-full overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(eventsByCategory).map(([category, catEvents]) => (
              <div
                key={category}
                className="bg-muted/50 rounded-lg p-3 border border-border"
              >
                <h4 className="font-semibold text-xs uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  {category}
                </h4>
                <div className="space-y-1">
                  {catEvents.slice(0, 4).map((event) => (
                    <div key={event.name} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{event.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.properties.length} props
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PresentationSlide>

      {/* Slide 2: Segments Overview */}
      <PresentationSlide
        title="Recommended Segments"
        subtitle="Pre-built audience segments for targeting"
        slideNumber={2}
        footer="Events & Segmentation"
      >
        <div className="h-full overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Segment</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Events</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Targeting Use</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.name} className="border-b border-border/50">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-primary" />
                      <div>
                        <span className="font-medium text-foreground">{segment.name}</span>
                        <p className="text-muted-foreground text-xs">{segment.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {segment.events.map((event) => (
                        <span
                          key={event}
                          className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-xs"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{segment.targetingUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PresentationSlide>
    </div>
  );
};
