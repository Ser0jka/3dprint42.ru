import { ImageResponse } from "next/og";

export const alt =
  "Центр 3D-печати — функциональные детали, прототипы и малые серии в Кемерово";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#11110f",
          color: "#f4f0e9",
          padding: "62px 70px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 27,
            letterSpacing: "0.12em",
          }}
        >
          <span>ЦЕНТР 3D-ПЕЧАТИ</span>
          <span style={{ color: "#f57a2a" }}>КЕМЕРОВО / КУЗБАСС</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              lineHeight: 0.95,
              letterSpacing: "-0.055em",
            }}
          >
            3D-ПЕЧАТЬ ПОД ЗАДАЧУ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 31,
              lineHeight: 1.3,
              color: "#b9b5ae",
            }}
          >
            Функциональные детали · прототипы · малые серии
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #5c5a55",
            paddingTop: 24,
            fontSize: 22,
            letterSpacing: "0.08em",
            color: "#b9b5ae",
          }}
        >
          <span>PLA / PETG / ABS / TPU</span>
          <span>ОТ ФАЙЛА ДО ГОТОВОЙ ДЕТАЛИ</span>
        </div>
      </div>
    ),
    size,
  );
}
