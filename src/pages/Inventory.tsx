import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Inventory = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Estoque</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Veículos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A lista de veículos do estoque será exibida aqui em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
