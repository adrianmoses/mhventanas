import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { formatTime, today } from "./format.js";
import { createHunt, updateHunt } from "./hunts.js";
import {
  HUNT_CAUSES,
  HUNT_CAUSE_LABELS,
  HUNT_RANKS,
  HUNT_RANK_LABELS,
  HUNT_RESULTS,
  HUNT_RESULT_LABELS,
  HUNT_WEAPONS,
  HUNT_WEAPON_LABELS,
} from "./labels.js";
import type { Hunt } from "./stats.js";

type Mode =
  | { kind: "new"; repeatFrom?: Hunt | null }
  | { kind: "edit"; hunt: Hunt };

const TEXT_FIELDS = [
  "variant",
  "build",
  "hits",
  "cartCause",
  "learned",
  "weaknesses",
  "missingItems",
  "prep",
  "wentWell",
  "mainError",
  "nextGoal",
] as const;

/** Initial values: blank, a copy of the repeated hunt's setup, or the hunt being edited. */
function initialValues(mode: Mode) {
  if (mode.kind === "edit") {
    const h = mode.hunt;
    return { ...h, time: h.timeSeconds == null ? "" : formatTime(h.timeSeconds) };
  }
  const r = mode.repeatFrom;
  return {
    huntedOn: today(),
    monsterName: r?.monsterName ?? "",
    rank: r?.rank ?? "alto",
    variant: r?.variant ?? null,
    weapon: r?.weapon ?? "longsword",
    build: r?.build ?? null,
    time: "",
    carts: 0,
    result: "ok",
    causes: [] as string[],
  } as Partial<Hunt> & { time: string };
}

export function HuntForm({ mode, monsterNames }: { mode: Mode; monsterNames: string[] }) {
  const navigate = useNavigate();
  const create = useServerFn(createHunt);
  const update = useServerFn(updateHunt);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const v = initialValues(mode);
  const editing = mode.kind === "edit";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const hunt: Record<string, unknown> = Object.fromEntries(
      [...fd.keys()].filter((k) => k !== "causes").map((k) => [k, fd.get(k)]),
    );
    hunt.causes = fd.getAll("causes");
    setBusy(true);
    setMsg("Guardando…");
    try {
      const res = editing
        ? await update({ data: { id: mode.hunt.id, hunt } })
        : await create({ data: hunt });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      await navigate({ to: "/cuaderno", search: { abierta: res.id }, hash: `caza-${res.id}` });
    } catch {
      setMsg("No se pudo guardar. Inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  const text = (name: (typeof TEXT_FIELDS)[number]) =>
    ({ name, defaultValue: (v as Partial<Hunt>)[name] ?? "" }) as const;

  return (
    <form className="cz-form" onSubmit={onSubmit}>
      <fieldset>
        <legend>{editing ? "Editar cacería" : "Nueva cacería"}</legend>
        <div className="cz-grid">
          <label className="cz-f">
            Fecha
            <input type="date" name="huntedOn" defaultValue={v.huntedOn} required />
          </label>
          <label className="cz-f">
            Monstruo
            <input
              name="monsterName"
              list="cz-monsters"
              defaultValue={v.monsterName}
              required
              placeholder="Rathalos"
              autoFocus
            />
          </label>
          <label className="cz-f">
            Rango
            <select name="rank" defaultValue={v.rank}>
              {HUNT_RANKS.map((r) => (
                <option key={r} value={r}>
                  {HUNT_RANK_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="cz-f">
            Variante
            <input {...text("variant")} placeholder="Templado, arquetemplado…" />
          </label>
        </div>
        <div className="cz-grid">
          <label className="cz-f">
            Arma
            <select name="weapon" defaultValue={v.weapon}>
              {HUNT_WEAPONS.map((w) => (
                <option key={w} value={w}>
                  {HUNT_WEAPON_LABELS[w]}
                </option>
              ))}
            </select>
          </label>
          <label className="cz-f">
            Tiempo (mm:ss)
            <input
              name="time"
              className="cz-num"
              defaultValue={v.time}
              placeholder="18:40"
              pattern="\d{1,3}:[0-5]\d"
              inputMode="numeric"
            />
          </label>
          <label className="cz-f">
            Desmayos
            <select name="carts" defaultValue={String(v.carts ?? 0)}>
              {[0, 1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="cz-f">
            Resultado
            <select name="result" defaultValue={v.result}>
              {HUNT_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {HUNT_RESULT_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="cz-f">
          <span>
            Build <span className="cz-hint">set, habilidades clave, decoraciones</span>
          </span>
          <input {...text("build")} placeholder="Set Rathalos, Ataque 4, Ojo crítico 3" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Lo que te hizo daño</legend>
        <label className="cz-f">
          <span>
            Ataques que te golpearon <span className="cz-hint">y cuántas veces</span>
          </span>
          <textarea {...text("hits")} placeholder="Picado aéreo ×4, coletazo ×2" />
        </label>
        <div className="cz-f" role="group" aria-labelledby="cz-causes-label">
          <span id="cz-causes-label">Por qué te golpearon</span>
          <div className="cz-chips">
            {HUNT_CAUSES.map((c) => (
              <label className="cz-chip" key={c}>
                <input
                  type="checkbox"
                  name="causes"
                  value={c}
                  defaultChecked={(v.causes as string[] | undefined)?.includes(c)}
                />
                <span>{HUNT_CAUSE_LABELS[c]}</span>
              </label>
            ))}
          </div>
        </div>
        <label className="cz-f">
          Qué te hizo desmayarte
          <input {...text("cartCause")} placeholder="Rugido + bola de fuego sin aguante" />
        </label>
      </fieldset>

      <fieldset>
        <legend>Lo que aprendiste del monstruo</legend>
        <div className="cz-grid">
          <label className="cz-f">
            Señales y aperturas
            <textarea
              {...text("learned")}
              placeholder="Tras el rugido hay tiempo para un contraataque"
            />
          </label>
          <label className="cz-f">
            Debilidades, partes rotas, estados
            <textarea
              {...text("weaknesses")}
              placeholder="Débil al dragón; rompí cabeza y alas; el veneno funcionó"
            />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Preparación</legend>
        <div className="cz-grid">
          <label className="cz-f">
            Objetos que faltaron
            <input {...text("missingItems")} placeholder="Antídotos" />
          </label>
          <label className="cz-f">
            Comida y trampas
            <input {...text("prep")} placeholder="Comí ataque, 1 trampa de choque" />
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Autoevaluación</legend>
        <div className="cz-grid">
          <label className="cz-f">
            Una cosa que hiciste bien
            <input {...text("wentWell")} />
          </label>
          <label className="cz-f">
            Error principal
            <input {...text("mainError")} />
          </label>
        </div>
        <label className="cz-f">
          Objetivo para la próxima vez
          <input {...text("nextGoal")} placeholder="Alejarme en diagonal cuando despega" />
        </label>
      </fieldset>

      <div className="cz-form-actions">
        <button className="cz-btn" type="submit" disabled={busy}>
          {editing ? "Guardar cambios" : "Guardar cacería"}
        </button>
        <Link className="cz-btn-ghost" to="/cuaderno">
          Cancelar
        </Link>
        <span className="cz-hint" role="status">
          {msg}
        </span>
      </div>

      <datalist id="cz-monsters">
        {monsterNames.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </form>
  );
}
