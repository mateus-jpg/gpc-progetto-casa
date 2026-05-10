"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  COHABITATION_TYPE_OPTIONS,
  HOUSE_TYPE_OPTIONS,
} from "@/lib/house-setup";

function BooleanSelect({ id, label, onChange, value }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
        id={id}
        value={value === true ? "true" : value === false ? "false" : ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(
            nextValue === "true" ? true : nextValue === "false" ? false : null,
          );
        }}
      >
        <option value="">Non indicato</option>
        <option value="true">Si</option>
        <option value="false">No</option>
      </select>
    </div>
  );
}

export function HouseSetupFields({ value, onChange }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Casa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="house-setup-type">Tipologia abitazione</Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              id="house-setup-type"
              value={value.houseType}
              onChange={(event) => onChange("houseType", event.target.value)}
            >
              <option value="">Seleziona</option>
              {HOUSE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-setup-type-other">Altro tipo</Label>
            <Input
              id="house-setup-type-other"
              value={value.houseTypeOther}
              onChange={(event) =>
                onChange("houseTypeOther", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-setup-owner">Proprieta immobile</Label>
            <Input
              id="house-setup-owner"
              value={value.propertyOwner}
              onChange={(event) =>
                onChange("propertyOwner", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-setup-rent-holder">
              Intestatario affitto
            </Label>
            <Input
              id="house-setup-rent-holder"
              value={value.rentContractHolder}
              onChange={(event) =>
                onChange("rentContractHolder", event.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BooleanSelect
            id="house-setup-managing-entity"
            label="Presenza ente gestore"
            onChange={(nextValue) => onChange("hasManagingEntity", nextValue)}
            value={value.hasManagingEntity}
          />
          <div className="space-y-2">
            <Label htmlFor="house-setup-managing-entity-name">
              Nominativo ente gestore
            </Label>
            <Input
              id="house-setup-managing-entity-name"
              value={value.managingEntityName}
              onChange={(event) =>
                onChange("managingEntityName", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house-setup-technical">Referente tecnico</Label>
            <Input
              id="house-setup-technical"
              value={value.technicalReferent}
              onChange={(event) =>
                onChange("technicalReferent", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house-setup-administrative">
              Referente amministrativo
            </Label>
            <Input
              id="house-setup-administrative"
              value={value.administrativeReferent}
              onChange={(event) =>
                onChange("administrativeReferent", event.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="house-setup-authorized-residents">
              Abitanti autorizzati
            </Label>
            <Input
              id="house-setup-authorized-residents"
              min="0"
              type="number"
              value={value.authorizedResidents}
              onChange={(event) =>
                onChange("authorizedResidents", event.target.value)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-setup-max-guests">
              Numero massimo ospitabili
            </Label>
            <Input
              id="house-setup-max-guests"
              min="0"
              type="number"
              value={value.maxGuests}
              onChange={(event) => onChange("maxGuests", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="house-setup-cohabitation">
              Tipologia convivenza
            </Label>
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              id="house-setup-cohabitation"
              value={value.cohabitationType}
              onChange={(event) =>
                onChange("cohabitationType", event.target.value)
              }
            >
              <option value="">Seleziona</option>
              {COHABITATION_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <BooleanSelect
            id="house-setup-condominium-rules"
            label="Regolamento condominiale"
            onChange={(nextValue) => onChange("hasCondominiumRules", nextValue)}
            value={value.hasCondominiumRules}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BooleanSelect
            id="house-setup-residency"
            label="Possibilita di residenza"
            onChange={(nextValue) => onChange("residencyAllowed", nextValue)}
            value={value.residencyAllowed}
          />
          <BooleanSelect
            id="house-setup-domicile"
            label="Possibilita di domicilio"
            onChange={(nextValue) => onChange("domicileAllowed", nextValue)}
            value={value.domicileAllowed}
          />
          <BooleanSelect
            id="house-setup-hospitality"
            label="Ospitalita consentita"
            onChange={(nextValue) => onChange("hospitalityAllowed", nextValue)}
            value={value.hospitalityAllowed}
          />
          <BooleanSelect
            id="house-setup-legal-operator"
            label="Possibilita operatore legale"
            onChange={(nextValue) =>
              onChange("legalOperatorAllowed", nextValue)
            }
            value={value.legalOperatorAllowed}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="house-setup-criticalities">
              Criticita della convivenza
            </Label>
            <Textarea
              id="house-setup-criticalities"
              rows={4}
              value={value.cohabitationCriticalities}
              onChange={(event) =>
                onChange("cohabitationCriticalities", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="house-setup-notes">Note di setup</Label>
            <Textarea
              id="house-setup-notes"
              rows={4}
              value={value.referenceNotes}
              onChange={(event) =>
                onChange("referenceNotes", event.target.value)
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
