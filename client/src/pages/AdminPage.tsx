import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getApiUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: string;
  featureName: string;
  isEnabled: boolean;
  filters: Record<string, boolean>;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export function AdminPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoggedInAsAdmin, setIsLoggedInAsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);

  useEffect(() => {
    const adminToken = sessionStorage.getItem("adminToken");
    if (adminToken) {
      setIsLoggedInAsAdmin(true);
      fetchFeatureFlags();
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: adminPassword }),
      });

      if (!response.ok) {
        toast({
          title: "Error",
          description: "Invalid admin password",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json();
      sessionStorage.setItem("adminToken", data.token);
      setIsLoggedInAsAdmin(true);
      setAdminPassword("");
      await fetchFeatureFlags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to login as admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatureFlags = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl("/api/feature-flags"), {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setFlags(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch feature flags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (featureName: string, newValue: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(
        getApiUrl(`/api/feature-flags/${featureName}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isEnabled: newValue }),
        }
      );

      if (!response.ok) throw new Error("Failed to update feature");

      toast({
        title: "Success",
        description: `Feature ${featureName} ${newValue ? "enabled" : "disabled"}`,
      });
      await fetchFeatureFlags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update feature flag",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFilter = async (
    featureName: string,
    filterName: string,
    newValue: boolean
  ) => {
    setLoading(true);
    try {
      const flag = flags.find((f) => f.featureName === featureName);
      if (!flag) return;

      const updatedFilters = {
        ...flag.filters,
        [filterName]: newValue,
      };

      const response = await fetch(
        getApiUrl(`/api/feature-flags/${featureName}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ filters: updatedFilters }),
        }
      );

      if (!response.ok) throw new Error("Failed to update filter");

      toast({
        title: "Success",
        description: `Filter updated for ${featureName}`,
      });
      await fetchFeatureFlags();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update filter",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    setIsLoggedInAsAdmin(false);
    setLocation("/");
  };

  if (!isLoggedInAsAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-3xl font-bold mb-6 text-foreground">
            Admin Login
          </h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                data-testid="input-admin-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-admin-login"
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            Logout
          </Button>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground">
            Feature Locks
          </h2>

          {flags.length === 0 ? (
            <Card className="p-6">
              <p className="text-muted-foreground">No feature flags found</p>
            </Card>
          ) : (
            flags.map((flag) => (
              <Card key={flag.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {flag.featureName}
                    </h3>
                    {flag.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {flag.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`toggle-${flag.featureName}`}
                      className="text-sm"
                    >
                      {flag.isEnabled ? "Enabled" : "Disabled"}
                    </Label>
                    <Switch
                      id={`toggle-${flag.featureName}`}
                      checked={flag.isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggleFeature(flag.featureName, checked)
                      }
                      disabled={loading}
                      data-testid={`switch-feature-${flag.featureName}`}
                    />
                  </div>
                </div>

                {flag.filters && Object.keys(flag.filters).length > 0 && (
                  <div className="pt-4 border-t space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Filters:
                    </p>
                    {Object.entries(flag.filters).map(([filterName, enabled]) => (
                      <div
                        key={filterName}
                        className="flex items-center justify-between pl-4"
                      >
                        <Label
                          htmlFor={`filter-${flag.featureName}-${filterName}`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {filterName}
                        </Label>
                        <Switch
                          id={`filter-${flag.featureName}-${filterName}`}
                          checked={enabled as boolean}
                          onCheckedChange={(checked) =>
                            handleToggleFilter(
                              flag.featureName,
                              filterName,
                              checked
                            )
                          }
                          disabled={loading || !flag.isEnabled}
                          data-testid={`switch-filter-${flag.featureName}-${filterName}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
