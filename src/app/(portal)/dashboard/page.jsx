"use client";

import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function Page() {
  const { availableStructures } = useAuth();

  // For admin users, we need to fetch all structures
  // For non-admin users, availableStructures already contains only their assigned structures
  const structures = availableStructures;

  return (
    <>
      {/* <SectionCards
        title="Strutture Assegnate"
        description="Visualizza le strutture di cui sei responsabile con il numero di persone e staff."
      />  */}

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4  *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {structures.map((structure) => (
          <Link href={`/${structure.id}`} key={structure.id}>
            <Card className="border gap-2 rounded-lg p-4 shadow hover:shadow-lg transition">
              <CardTitle className="text-xl font-semibold ">
                {structure.name || structure.id}
              </CardTitle>
              <p className="text-gray-600">
                Persone in carico: {structure.peopleCount}
              </p>
              <p className="text-gray-600">Operatori: {structure.staffCount}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
