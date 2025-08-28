import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface EventModeContextProps {
  isActive: boolean;
  startTime: Date | null;
  endTime: Date | null;
  setEventState: (
    isActive: boolean,
    startTime: Date | null,
    endTime: Date | null,
    width: number,
    height: number,
  ) => Promise<void>;
  width: number;
  height: number;
}

const EventModeContext = createContext<EventModeContextProps | undefined>(
  undefined,
);

export const EventModeProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [width, setWidth] = useState<number>(100);
  const [height, setHeight] = useState<number>(100);

  useEffect(() => {
    // Fetch initial data from the API
    const fetchEventMode = async () => {
      try {
        const response = await fetch("/api/eventMode");
        if (response.ok) {
          const data = await response.json();
          setIsActive(data.active);
          setStartTime(new Date(data.startDate));
          setEndTime(new Date(data.endDate));
          setWidth(data.width);
          setHeight(data.height);
        } else {
          console.error("Failed to fetch event mode:", await response.json());
        }
      } catch (error) {
        console.error("Error fetching event mode:", error);
      }
    };

    fetchEventMode();
  }, []);

  const setEventState = async (
    active: boolean,
    start: Date | null,
    end: Date | null,
    width: number,
    height: number,
  ) => {
    setIsActive(active);
    setStartTime(start);
    setEndTime(end);
    setWidth(width);
    setHeight(height);

    // Update the database
    try {
      const response = await fetch("/api/eventMode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start?.toISOString(),
          endDate: end?.toISOString(),
          active,
          width,
          height,
        }),
      });

      if (!response.ok) {
        console.error("Failed to update event mode:", await response.json());
      }
    } catch (error) {
      console.error("Error updating event mode:", error);
    }
  };

  return (
    <EventModeContext.Provider
      value={{ isActive, startTime, endTime, width, height, setEventState }}
    >
      {children}
    </EventModeContext.Provider>
  );
};

export const useEventMode = (): EventModeContextProps => {
  const context = useContext(EventModeContext);
  if (!context) {
    throw new Error("useEventMode must be used within an EventModeProvider");
  }
  return context;
};
