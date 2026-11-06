import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/lib/actions/user-actions'
import { Mail, Shield, MapPin, Church } from 'lucide-react'

export function ProfileCard({ profile }: { profile: UserProfile }) {
  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Your identity and system access level.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Email */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-paragraph-small font-medium text-foreground">Email Address</p>
            <p className="text-paragraph-small text-muted-foreground">{profile.email}</p>
          </div>
        </div>

        {/* Role */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted p-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-paragraph-small font-medium text-foreground">System Role</p>
            <Badge variant="outline" className="mt-1 bg-primary/10 text-primary border-primary/20">
              {formatRole(profile.role)}
            </Badge>
          </div>
        </div>

        {/* Region (if applicable) */}
        {profile.regionName && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-muted p-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-paragraph-small font-medium text-foreground">Assigned Region</p>
              <p className="text-paragraph-small text-muted-foreground">{profile.regionName}</p>
            </div>
          </div>
        )}

        {/* Church (if applicable) */}
        {profile.churchName && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md bg-muted p-2">
              <Church className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-paragraph-small font-medium text-foreground">Assigned Church</p>
              <p className="text-paragraph-small text-muted-foreground">{profile.churchName}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}