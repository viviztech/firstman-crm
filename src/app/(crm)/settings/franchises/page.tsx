import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import {
  createConstituencyAction,
  mapPincodeAction,
  removeFranchiseTerritoryAction,
  saveFranchiseTerritoryAction,
} from "@/actions/franchise";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/session";
import { listFranchiseAdminData } from "@/services/franchise-territories";

const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export default async function FranchiseSettingsPage() {
  await requireRole("super_admin", "manager");
  const data = await listFranchiseAdminData();
  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/settings" />}
      >
        <ChevronLeft className="size-4" /> Settings
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Franchise territories</h1>
        <p className="text-sm text-muted-foreground">
          Exclusive state, parliamentary, assembly and pincode territories with basic and additional
          commission rates.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assign a franchise</CardTitle>
          <CardDescription>
            Each franchise user can hold one territory. State basic defaults to 1%; every other
            level defaults to 5%. Additional defaults to 10%.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveFranchiseTerritoryAction} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>User</Label>
              <select name="userId" required className={selectClass}>
                <option value="">Select franchise</option>
                {data.franchiseUsers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} ({row.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Level</Label>
              <select name="level" required className={selectClass}>
                <option value="state">State</option>
                <option value="parliamentary">Parliamentary constituency</option>
                <option value="assembly">Assembly constituency</option>
                <option value="area">Area / pincode</option>
              </select>
            </div>
            <div>
              <Label>State</Label>
              <select name="stateId" required className={selectClass}>
                <option value="">Select state</option>
                {data.states.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Parliamentary constituency</Label>
              <select name="parliamentaryConstituencyId" className={selectClass}>
                <option value="">Not applicable</option>
                {data.parliamentaryConstituencies.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} — {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Assembly constituency</Label>
              <select name="assemblyConstituencyId" className={selectClass}>
                <option value="">Not applicable</option>
                {data.assemblyConstituencies.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} — {row.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Pincode</Label>
              <Input name="pincode" pattern="[0-9]{6}" placeholder="600001" />
            </div>
            <div>
              <Label>Basic rate (basis points)</Label>
              <Input
                name="basicRateBps"
                type="number"
                min="0"
                max="10000"
                placeholder="Auto: 100 state, 500 others"
              />
            </div>
            <div>
              <Label>Additional rate (basis points)</Label>
              <Input
                name="additionalRateBps"
                type="number"
                min="0"
                max="10000"
                defaultValue="1000"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Save territory</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No franchise territories assigned.</p>
          ) : (
            data.territories.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{row.user.name}</p>
                  <p className="text-muted-foreground capitalize">
                    {row.level} ·{" "}
                    {row.level === "state"
                      ? row.state.name
                      : (row.parliamentaryConstituency?.name ??
                        row.assemblyConstituency?.name ??
                        row.pincode)}{" "}
                    · {(row.basicRateBps / 100).toFixed(2)}% +{" "}
                    {(row.additionalRateBps / 100).toFixed(2)}%
                  </p>
                </div>
                <form action={removeFranchiseTerritoryAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button variant="outline" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add constituency</CardTitle>
            <CardDescription>
              CRUD fallback for official imports and later delimitation changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createConstituencyAction} className="grid gap-3">
              <select name="kind" className={selectClass}>
                <option value="parliamentary">Parliamentary</option>
                <option value="assembly">Assembly</option>
              </select>
              <select name="stateId" required className={selectClass}>
                <option value="">Select state</option>
                {data.states.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <select name="parliamentaryConstituencyId" className={selectClass}>
                <option value="">Parent PC (assembly only)</option>
                {data.parliamentaryConstituencies.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} — {row.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input name="code" required placeholder="Constituency code" />
                <Input name="name" required placeholder="Name" />
              </div>
              <Input name="sourceUrl" type="url" placeholder="Official source URL" />
              <Input name="sourceVersion" placeholder="Source/version, e.g. ECI 2024" />
              <Button type="submit" className="w-fit">
                Add constituency
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Map pincode</CardTitle>
            <CardDescription>
              Manual override for ambiguous or changed constituency crosswalks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={mapPincodeAction} className="grid gap-3">
              <Input name="pincode" required pattern="[0-9]{6}" placeholder="600001" />
              <select name="assemblyConstituencyId" required className={selectClass}>
                <option value="">Select assembly constituency</option>
                {data.assemblyConstituencies.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} — {row.name}
                  </option>
                ))}
              </select>
              <Button type="submit" className="w-fit">
                Save mapping
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
