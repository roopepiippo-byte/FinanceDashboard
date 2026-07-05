import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface Step {
  icon: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: "👋",
    title: "Tervetuloa Ledgeriin",
    body:
      "Ledger on henkilökohtainen talouskojelauta, joka toimii kokonaan " +
      "omalla laitteellasi: tietoja ei lähetetä minnekään, ei tilejä, ei " +
      "pilveä. Kaikki data on selaimesi paikallisessa tietokannassa.",
  },
  {
    icon: "📥",
    title: "1 · Tuo pankkitapahtumat",
    body:
      "Aloita Tuo CSV -sivulta: vedä Nordean tiliote-CSV pudotusalueelle. " +
      "Saman tiedoston voi tuoda uudelleen turvallisesti — kaksoiskappaleita " +
      "ei synny. Muut sivut avautuvat, kun tapahtumia on tuotu.",
  },
  {
    icon: "🏷️",
    title: "2 · Luokittele kauppiaat",
    body:
      "Luokittele-sivu ryhmittelee tuntemattomat kauppiaat. Sovellus ehdottaa " +
      "luokkaa aiempien sääntöjesi ja suomalaisen kauppiassanaston " +
      "perusteella — hyväksy ehdotus klikkaamalla, tai kaikki kerralla. " +
      "Säännöt-välilehdellä voit muokata tehtyjä luokitteluja jälkikäteen.",
  },
  {
    icon: "📊",
    title: "3 · Kojelauta ja porautuminen",
    body:
      "Kojelauta näyttää tulot, kulut, netton ja säästöasteen valitulta " +
      "aikaväliltä. Lähes jokaista lukua, korttia ja kaavion palkkia voi " +
      "klikata — saat aina esiin tapahtumat, joista luku on laskettu.",
  },
  {
    icon: "🎯",
    title: "4 · Budjetti ja varallisuus",
    body:
      "Budjetti-sivulla asetat säästötavoitteen ja luokkakohtaiset rajat, " +
      "joita kuukausimittarit vertaavat toteumaan. Varallisuus-sivulla " +
      "määrittelet tilisi ja kirjaat niiden arvot kuukausittain — arvot voi " +
      "liittää suoraan taulukkolaskennasta.",
  },
  {
    icon: "🔍",
    title: "5 · Analyysi ja asetukset",
    body:
      "Analyysi-sivu etsii poikkeamat, toistuvat maksut ja trendit " +
      "puolestasi. Asetuksissa valitset, mitkä luokat lasketaan mukaan ja " +
      "mihin suuntaan (tulot/kulut/siirrot). Tämän esittelyn saa auki " +
      "uudelleen yläpalkin ?-napista. Ohjeita löytyy myös korttien " +
      "ⓘ-kuvakkeista.",
  },
];

/** First-run intro tour; reopenable from the header "?" button. */
export function Onboarding({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <div className="text-4xl">{s.icon}</div>
          <h3 className="mt-3 text-lg font-semibold text-text">{s.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
        </div>

        <div className="mt-5 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              aria-label={`Vaihe ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-5 bg-accent" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Ohita
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
              >
                Edellinen
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (last ? onClose() : setStep(step + 1))}
            >
              {last ? "Aloita käyttö" : "Seuraava"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
