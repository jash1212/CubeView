import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function IncidentCard({ incident }) {
  const color = incident.status === "ongoing" ? "destructive" : "secondary"

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {incident.title}
          <Badge variant={color}>{incident.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>{incident.description}</p>
        <p className="text-sm text-muted-foreground mt-2">
          Table: {incident.related_table} <br />
          Created: {new Date(incident.created_at).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}
