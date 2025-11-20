"use client";

import { format } from "date-fns";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Download,
  Home,
  Info,
  Lock,
  Mail,
  Menu,
  Search,
  Settings,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function ComponentsPage() {
  const [progress, setProgress] = useState(33);
  const [sliderValue, setSliderValue] = useState([50]);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [comboboxValue, setComboboxValue] = useState("");
  const [date, setDate] = useState<Date>();

  const frameworks = [
    { value: "next.js", label: "Next.js" },
    { value: "sveltekit", label: "SvelteKit" },
    { value: "nuxt.js", label: "Nuxt.js" },
    { value: "remix", label: "Remix" },
    { value: "astro", label: "Astro" },
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "angular", label: "Angular" },
  ];

  return (
    <div className="container mx-auto py-10 space-y-12">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">
          Component Showcase
        </h1>
        <p className="text-muted-foreground">
          A comprehensive reference of all available shadcn/ui components in
          this project.
        </p>
      </div>

      <Separator />

      {/* Tabs for Organization */}
      <Tabs defaultValue="forms" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="data">Data Display</TabsTrigger>
        </TabsList>

        {/* Forms Tab */}
        <TabsContent value="forms" className="space-y-8">
          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>
                Different button variants and sizes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled>Disabled</Button>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  With Icon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle>Input Fields</CardTitle>
              <CardDescription>
                Text inputs with various configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled">Disabled Input</Label>
                <Input id="disabled" disabled value="Disabled input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="with-icon">Input with Icon</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="with-icon"
                    placeholder="Search..."
                    className="pl-8"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Textarea */}
          <Card>
            <CardHeader>
              <CardTitle>Textarea</CardTitle>
              <CardDescription>Multi-line text input</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Select */}
          <Card>
            <CardHeader>
              <CardTitle>Select</CardTitle>
              <CardDescription>Dropdown selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Select Role</Label>
                <Select>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="guest">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Combobox */}
          <Card>
            <CardHeader>
              <CardTitle>Combobox</CardTitle>
              <CardDescription>
                Searchable dropdown with autocomplete
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Framework</Label>
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className="w-full justify-between"
                    >
                      {comboboxValue
                        ? frameworks.find(
                            (framework) => framework.value === comboboxValue,
                          )?.label
                        : "Select framework..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search framework..." />
                      <CommandList>
                        <CommandEmpty>No framework found.</CommandEmpty>
                        <CommandGroup>
                          {frameworks.map((framework) => (
                            <CommandItem
                              key={framework.value}
                              value={framework.value}
                              onSelect={(currentValue) => {
                                setComboboxValue(
                                  currentValue === comboboxValue
                                    ? ""
                                    : currentValue,
                                );
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={
                                  comboboxValue === framework.value
                                    ? "mr-2 h-4 w-4 opacity-100"
                                    : "mr-2 h-4 w-4 opacity-0"
                                }
                              />
                              {framework.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {comboboxValue && (
                  <p className="text-sm text-muted-foreground">
                    Selected:{" "}
                    {frameworks.find((f) => f.value === comboboxValue)?.label}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Date Picker */}
          <Card>
            <CardHeader>
              <CardTitle>Date Picker</CardTitle>
              <CardDescription>
                Select dates with a calendar popup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pick a date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {date && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {format(date, "PPP")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Checkbox & Radio */}
          <Card>
            <CardHeader>
              <CardTitle>Checkboxes & Radio Buttons</CardTitle>
              <CardDescription>Selection controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Checkboxes</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Accept terms and conditions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="marketing" />
                  <label
                    htmlFor="marketing"
                    className="text-sm font-medium leading-none"
                  >
                    Send me marketing emails
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Radio Group</Label>
                <RadioGroup defaultValue="comfortable">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="default" id="r1" />
                    <Label htmlFor="r1">Default</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="comfortable" id="r2" />
                    <Label htmlFor="r2">Comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="compact" id="r3" />
                    <Label htmlFor="r3">Compact</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Switch */}
          <Card>
            <CardHeader>
              <CardTitle>Switch</CardTitle>
              <CardDescription>Toggle between two states</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="airplane-mode">Airplane Mode</Label>
                <Switch id="airplane-mode" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Notifications</Label>
                <Switch id="notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Slider & Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Slider & Progress</CardTitle>
              <CardDescription>
                Range selection and progress indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Volume: {sliderValue[0]}%</Label>
                <Slider
                  value={sliderValue}
                  onValueChange={setSliderValue}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Progress: {progress}%</Label>
                <Progress value={progress} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    Decrease
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    Increase
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-8">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
              <CardDescription>Display important messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>
                  This is an informational alert message.
                </AlertDescription>
              </Alert>

              <Alert
                variant="default"
                className="border-blue-500 text-blue-700 dark:text-blue-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your changes have been saved successfully.
                </AlertDescription>
              </Alert>

              <Alert
                variant="default"
                className="border-yellow-500 text-yellow-700 dark:text-yellow-400"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  Please review your information before proceeding.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  There was an error processing your request.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>
                Small count and labeling component
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge className="bg-green-500 hover:bg-green-600">
                  Success
                </Badge>
                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                  Warning
                </Badge>
                <Badge className="bg-blue-500 hover:bg-blue-600">Info</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-8">
          {/* Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Cards</CardTitle>
              <CardDescription>
                Container components for content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Card Title</CardTitle>
                    <CardDescription>
                      Card description goes here
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      This is the card content area where you can place any
                      content.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Action</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>With Icon</CardTitle>
                    <CardDescription>Card with header icon</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">2,543</p>
                      <p className="text-sm text-muted-foreground">
                        Total Users
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                    <CardDescription>Performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Completion</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <Progress value={75} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Separators */}
          <Card>
            <CardHeader>
              <CardTitle>Separators</CardTitle>
              <CardDescription>Visual dividers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm">Content above separator</p>
                <Separator className="my-4" />
                <p className="text-sm">Content below separator</p>
              </div>
              <div className="flex h-20 items-center">
                <span className="text-sm">Left</span>
                <Separator orientation="vertical" className="mx-4" />
                <span className="text-sm">Right</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Display Tab */}
        <TabsContent value="data" className="space-y-8">
          {/* Icons */}
          <Card>
            <CardHeader>
              <CardTitle>Icons</CardTitle>
              <CardDescription>
                Lucide icons available in the project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 md:grid-cols-10">
                <div className="flex flex-col items-center gap-2">
                  <Home className="h-6 w-6" />
                  <span className="text-xs">Home</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <User className="h-6 w-6" />
                  <span className="text-xs">User</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Settings className="h-6 w-6" />
                  <span className="text-xs">Settings</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Mail className="h-6 w-6" />
                  <span className="text-xs">Mail</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Lock className="h-6 w-6" />
                  <span className="text-xs">Lock</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Search className="h-6 w-6" />
                  <span className="text-xs">Search</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <CalendarIcon className="h-6 w-6" />
                  <span className="text-xs">Calendar</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6" />
                  <span className="text-xs">Upload</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Download className="h-6 w-6" />
                  <span className="text-xs">Download</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Menu className="h-6 w-6" />
                  <span className="text-xs">Menu</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Text styles and formatting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold">Heading 1</h1>
                <h2 className="text-3xl font-semibold">Heading 2</h2>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
                <h4 className="text-xl font-semibold">Heading 4</h4>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-base">
                  This is a regular paragraph with normal weight text.
                </p>
                <p className="text-sm text-muted-foreground">
                  This is smaller muted text, often used for descriptions.
                </p>
                <p className="text-lg font-semibold">
                  This is larger semibold text for emphasis.
                </p>
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
                  inline code example
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>
                Theme colors used in the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-background border" />
                    <div>
                      <p className="text-sm font-medium">Background</p>
                      <p className="text-xs text-muted-foreground">
                        bg-background
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-foreground" />
                    <div>
                      <p className="text-sm font-medium">Foreground</p>
                      <p className="text-xs text-muted-foreground">
                        bg-foreground
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-primary" />
                    <div>
                      <p className="text-sm font-medium">Primary</p>
                      <p className="text-xs text-muted-foreground">
                        bg-primary
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-secondary" />
                    <div>
                      <p className="text-sm font-medium">Secondary</p>
                      <p className="text-xs text-muted-foreground">
                        bg-secondary
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-muted" />
                    <div>
                      <p className="text-sm font-medium">Muted</p>
                      <p className="text-xs text-muted-foreground">bg-muted</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-accent" />
                    <div>
                      <p className="text-sm font-medium">Accent</p>
                      <p className="text-xs text-muted-foreground">bg-accent</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded bg-destructive" />
                    <div>
                      <p className="text-sm font-medium">Destructive</p>
                      <p className="text-xs text-muted-foreground">
                        bg-destructive
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded border" />
                    <div>
                      <p className="text-sm font-medium">Border</p>
                      <p className="text-xs text-muted-foreground">border</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Learn more about the components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">shadcn/ui Documentation</h4>
              <p className="text-sm text-muted-foreground">
                Visit the official documentation for detailed component usage
                and customization options.
              </p>
              <Button variant="outline" asChild>
                <a
                  href="https://ui.shadcn.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Documentation
                </a>
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">Lucide Icons</h4>
              <p className="text-sm text-muted-foreground">
                Browse the full collection of available icons for use in your
                components.
              </p>
              <Button variant="outline" asChild>
                <a
                  href="https://lucide.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Browse Icons
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
