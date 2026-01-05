import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  
  const [citizenForm, setCitizenForm] = useState({
    username: '',
    password: ''
  });
  
  const [adminForm, setAdminForm] = useState({
    username: '',
    password: '',
    department: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    email: '',
    phone: '',
    municipality: '',
    password: ''
  });

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!citizenForm.username || !citizenForm.password) {
      toast({
        title: "Error",
        description: "Please enter both username and password",
        variant: "destructive"
      });
      return;
    }

    try {
      await login(citizenForm.username, citizenForm.password);
      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminForm.username || !adminForm.password || !adminForm.department) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await login(adminForm.username, adminForm.password);
      setLocation('/admin');
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive"
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.username || !registerForm.email || !registerForm.phone || 
        !registerForm.municipality || !registerForm.password) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }

    try {
      await register({
        ...registerForm,
        type: 'citizen'
      });
      toast({
        title: "Success",
        description: "Registration successful! Welcome to the platform.",
        variant: "default"
      });
      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Registration failed",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Civic Grievance Platform</h1>
          <p className="text-muted-foreground mt-2">Report and track civic issues in your municipality</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Choose your login type below</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="citizen">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="citizen" data-testid="tab-citizen">Citizen</TabsTrigger>
                <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
              </TabsList>
              
              <TabsContent value="citizen">
                <form onSubmit={handleCitizenLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="citizen-username">Username</Label>
                    <Input
                      id="citizen-username"
                      data-testid="input-citizen-username"
                      type="text"
                      value={citizenForm.username}
                      onChange={(e) => setCitizenForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="citizen-password">Password</Label>
                    <Input
                      id="citizen-password"
                      data-testid="input-citizen-password"
                      type="password"
                      value={citizenForm.password}
                      onChange={(e) => setCitizenForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-citizen-login">
                    Sign In as Citizen
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      data-testid="input-admin-username"
                      type="text"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      data-testid="input-admin-password"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Enter your password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-department">Department</Label>
                    <Select value={adminForm.department} onValueChange={(value) => setAdminForm(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger data-testid="select-admin-department">
                        <SelectValue placeholder="Select your department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="sanitation">Sanitation</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="environment">Environment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-admin-login">
                    Sign In as Admin
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New Citizen Registration</CardTitle>
            <CardDescription>Register to report and track civic issues</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="register-username">Username</Label>
                <Input
                  id="register-username"
                  data-testid="input-register-username"
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Choose a username"
                />
              </div>
              <div>
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  data-testid="input-register-email"
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="register-phone">Phone</Label>
                <Input
                  id="register-phone"
                  data-testid="input-register-phone"
                  type="tel"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="register-municipality">Municipality</Label>
                <Select value={registerForm.municipality} onValueChange={(value) => setRegisterForm(prev => ({ ...prev, municipality: value }))}>
                  <SelectTrigger data-testid="select-register-municipality">
                    <SelectValue placeholder="Select your municipality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="delhi">Delhi</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                    <SelectItem value="pune">Pune</SelectItem>
                    <SelectItem value="hyderabad">Hyderabad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  data-testid="input-register-password"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Create a password"
                />
              </div>
              <Button type="submit" className="w-full" data-testid="button-register">
                Register
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}