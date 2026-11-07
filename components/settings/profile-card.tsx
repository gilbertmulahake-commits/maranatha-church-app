import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/lib/actions/user-actions'
import { Mail, Shield, MapPin, Church } from 'lucide-react'

export function ProfileCard({ profile }: { profile: UserProfile }) {
  const formatRole = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  return (
    <Card className="h-full w-full min-w-0">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Your identity and system access level.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-paragraph-small font-medium text-foreground">
              Email Address
            </p>
            <p className="text-paragraph-small text-muted-foreground break-all">
              {profile.email}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-paragraph-small font-medium text-foreground">
              System Role
            </p>
            <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
              {formatRole(profile.role)}
            </Badge>
          </div>
        </div>

        {profile.regionName && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-paragraph-small font-medium text-foreground">
                Assigned Region
              </p>
              <p className="text-paragraph-small text-muted-foreground">
                {profile.regionName}
              </p>
            </div>
          </div>
        )}

        {profile.churchName && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-muted p-2 shrink-0">
              <Church className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-paragraph-small font-medium text-foreground">
                Assigned Church
              </p>
              <p className="text-paragraph-small text-muted-foreground">
                {profile.churchName}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}