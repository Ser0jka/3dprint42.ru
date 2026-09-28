"use client";

import { useState } from "react";
import styles from "./calculator.module.css";
import { materialPrices, priceTiers } from "./print-pricing";

type HoveredCell = {
  row: number;
  column: number;
} | null;

const rateFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export default function InteractivePriceTable() {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell>(null);

  return (
    <div
      className={styles.priceTable}
      role="table"
      aria-label="Тарифы 3D-печати"
      onPointerLeave={() => setHoveredCell(null)}
    >
      <div className={styles.priceHeader} role="row">
        <span role="columnheader">МАТЕРИАЛ</span>
        {priceTiers.map((tier, column) => (
          <span
            className={hoveredCell?.column === column ? styles.priceAxisActive : undefined}
            role="columnheader"
            key={tier.label}
          >
            {tier.shortLabel}
          </span>
        ))}
      </div>

      {materialPrices.map((material, row) => (
        <div className={styles.priceRow} role="row" key={material.id}>
          <span
            className={`${styles.materialName} ${hoveredCell?.row === row ? styles.priceAxisActive : ""}`}
            role="rowheader"
          >
            <strong>{material.name}</strong>
            <small>{material.description}</small>
          </span>
          {material.rates.map((rate, column) => {
            const isRowActive = hoveredCell?.row === row;
            const isColumnActive = hoveredCell?.column === column;
            const className = [
              styles.priceCell,
              isRowActive || isColumnActive ? styles.priceAxisActive : "",
              isRowActive && isColumnActive ? styles.priceIntersection : "",
            ].filter(Boolean).join(" ");

            return (
              <span
                className={className}
                role="cell"
                data-label={priceTiers[column].shortLabel}
                key={priceTiers[column].label}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHoveredCell({ row, column });
                }}
              >
                {rate === null ? material.customLabel ?? "По запросу" : `${rateFormat.format(rate)} ₽/г`}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
