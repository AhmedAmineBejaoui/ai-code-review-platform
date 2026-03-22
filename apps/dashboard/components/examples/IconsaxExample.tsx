import React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconsaxThemeModeButton } from "./IconsaxThemeModeButton";

export function IconsaxExample() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Icônes Iconsax - Démonstration</h1>
        <IconsaxThemeModeButton />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="security" variant="Bold" size="lg" color="rgb(59, 130, 246)" />
            Icônes Iconsax - Exemples d'Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Security & Analytics Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="shield" variant="Outline" />
              Sécurité & Analyses
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" className="gap-2">
                <Icon name="security" variant="Linear" />
                Sécurité
              </Button>
              <Button variant="outline" className="gap-2">
                <Icon name="danger" variant="Bold" color="rgb(239, 68, 68)" />
                Erreurs Détectées
              </Button>
              <Button variant="outline" className="gap-2">
                <Icon name="chart" variant="TwoTone" color="rgb(34, 197, 94)" />
                Statistiques
              </Button>
              <Button variant="outline" className="gap-2">
                <Icon name="success" variant="Bold" color="rgb(34, 197, 94)" />
                Tests Passés
              </Button>
            </div>
          </div>

          {/* Navigation Icons */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="dashboard" variant="Bold" color="rgb(147, 51, 234)" />
              Navigation
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <Icon name="home" variant="Bulk" size="xl" color="rgb(59, 130, 246)" />
                <p className="mt-2 text-sm">Accueil</p>
              </Card>
              <Card className="p-4 text-center">
                <Icon name="dashboard" variant="Bold" size="xl" color="rgb(147, 51, 234)" />
                <p className="mt-2 text-sm">Dashboard</p>
              </Card>
              <Card className="p-4 text-center">
                <Icon name="users" variant="TwoTone" size="xl" color="rgb(236, 72, 153)" />
                <p className="mt-2 text-sm">Utilisateurs</p>
              </Card>
              <Card className="p-4 text-center">
                <Icon name="settings" variant="Outline" size="xl" color="rgb(107, 114, 128)" />
                <p className="mt-2 text-sm">Paramètres</p>
              </Card>
            </div>
          </div>

          {/* File & Code Icons */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="code" variant="Bold" color="rgb(99, 102, 241)" />
              Fichiers & Code
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="ghost" className="gap-2">
                <Icon name="documentCode" variant="Linear" />
                Fichier Code
              </Button>
              <Button variant="ghost" className="gap-2">
                <Icon name="folder" variant="Bulk" color="rgb(251, 191, 36)" />
                Dossier
              </Button>
              <Button variant="ghost" className="gap-2">
                <Icon name="codeCircle" variant="Bold" color="rgb(34, 197, 94)" />
                Code Circle
              </Button>
              <Button variant="ghost" className="gap-2">
                <Icon name="globe" variant="Linear" />
                Web
              </Button>
            </div>
          </div>

          {/* Status Icons with Different Variants */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="information" variant="Bold" color="rgb(59, 130, 246)" />
              États & Statuts
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center space-y-2">
                <Icon name="success" variant="Bold" size="xl" color="rgb(34, 197, 94)" />
                <p className="text-sm text-green-600">Succès</p>
              </div>
              <div className="text-center space-y-2">
                <Icon name="error" variant="Bold" size="xl" color="rgb(239, 68, 68)" />
                <p className="text-sm text-red-600">Erreur</p>
              </div>
              <div className="text-center space-y-2">
                <Icon name="warning" variant="Bold" size="xl" color="rgb(245, 158, 11)" />
                <p className="text-sm text-amber-600">Attention</p>
              </div>
              <div className="text-center space-y-2">
                <Icon name="info" variant="Bold" size="xl" color="rgb(59, 130, 246)" />
                <p className="text-sm text-blue-600">Information</p>
              </div>
              <div className="text-center space-y-2">
                <Icon name="flash" variant="Bold" size="xl" color="rgb(147, 51, 234)" />
                <p className="text-sm text-purple-600">Performance</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Icon name="edit" variant="Bold" />
              Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="gap-2">
                <Icon name="add" variant="Bold" />
                Ajouter
              </Button>
              <Button variant="secondary" size="sm" className="gap-2">
                <Icon name="edit" variant="Linear" />
                Modifier
              </Button>
              <Button variant="destructive" size="sm" className="gap-2">
                <Icon name="delete" variant="Bold" />
                Supprimer
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Icon name="refresh" variant="Linear" />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Icon name="export" variant="Linear" />
                Exporter
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}