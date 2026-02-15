# .NET 10 Employee CRUD Application - Three UI Approaches

This application serves as an educational demonstration of the three main UI implementation approaches available in .NET 10 for building web applications:

1. **Razor Pages** - Traditional server-side rendering with page-focused architecture
2. **Blazor Static SSR** - Server-side rendering with component-based architecture (non-interactive)
3. **Blazor SPA (WebAssembly)** - Client-side execution with full interactivity

The application provides identical functionality across all three approaches: basic CRUD operations for employee information with form fields and a data grid, using CSV files for simple local data storage.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Build Instructions](#build-instructions)
- [Run Instructions](#run-instructions)
- [Understanding the Three Approaches](#understanding-the-three-approaches)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **.NET 10 SDK** (version 10.0.100 or later)
  - Download from: https://dotnet.microsoft.com/download/dotnet/10.0
  - Verify installation: `dotnet --version`

## Project Structure

```
EmployeeAppDemo.sln
├── src/
│   ├── EmployeeCore.Shared/              # Shared business logic (Class Library)
│   │   ├── Models/
│   │   │   └── Employee.cs               # Employee domain model
│   │   ├── Services/
│   │   │   ├── IEmployeeRepository.cs    # Repository interface
│   │   │   └── CsvEmployeeRepository.cs  # CSV-based implementation
│   │   └── Validators/
│   │       └── EmployeeValidator.cs      # Validation logic
│   │
│   ├── EmployeeApp.RazorPages/           # Razor Pages UI
│   │   ├── Pages/
│   │   │   ├── Index.cshtml              # Employee list with grid
│   │   │   ├── Create.cshtml             # Create form
│   │   │   ├── Edit.cshtml               # Edit form
│   │   │   └── Delete.cshtml             # Delete confirmation
│   │   └── Program.cs
│   │
│   ├── EmployeeApp.BlazorStaticSSR/      # Blazor Static SSR UI
│   │   ├── Components/
│   │   │   ├── EmployeeGrid.razor        # Data grid component
│   │   │   ├── EmployeeForm.razor        # Form component
│   │   │   └── EmployeeDetail.razor      # Detail view
│   │   ├── Pages/
│   │   │   ├── Home.razor                # List view route
│   │   │   ├── Create.razor              # Create route
│   │   │   ├── Edit.razor                # Edit route
│   │   │   └── Delete.razor              # Delete route
│   │   └── Program.cs                    # Static SSR configuration
│   │
│   └── EmployeeApp.BlazorSPA/            # Blazor WebAssembly UI
│       ├── EmployeeApp.BlazorSPA/        # Server project (API + Hosting)
│       │   ├── Program.cs                # API endpoints configuration
│       │   └── Components/               # Server-side components
│       └── EmployeeApp.BlazorSPA.Client/ # WASM Client
│           ├── Services/
│           │   └── EmployeeApiClient.cs  # API client service
│           └── Pages/
│               ├── EmployeeGrid.razor    # Interactive grid
│               └── EmployeeForm.razor    # Interactive form
│
└── README.md                              # This file
```

## Build Instructions

### Option 1: Build All Projects

From the root directory:

```bash
# Build all projects in the solution
dotnet build src/EmployeeCore.Shared/EmployeeCore.Shared.csproj
dotnet build src/EmployeeApp.RazorPages/EmployeeApp.RazorPages.csproj
dotnet build src/EmployeeApp.BlazorStaticSSR/EmployeeApp.BlazorStaticSSR.csproj
dotnet build src/EmployeeApp.BlazorSPA/EmployeeApp.BlazorSPA/EmployeeApp.BlazorSPA.csproj
```

### Option 2: Build Individual Projects

```bash
# Build shared core library only
dotnet build src/EmployeeCore.Shared/EmployeeCore.Shared.csproj

# Build specific UI project
dotnet build src/EmployeeApp.RazorPages/EmployeeApp.RazorPages.csproj
```

## Run Instructions

### 1. Razor Pages UI

```bash
dotnet run --project src/EmployeeApp.RazorPages/EmployeeApp.RazorPages.csproj
```

Then navigate to: `https://localhost:5001`

**Features:**
- Traditional server-side rendering
- Page-focused architecture with PageModel classes
- Form postbacks with validation
- Full page reloads on navigation

### 2. Blazor Static SSR UI

```bash
dotnet run --project src/EmployeeApp.BlazorStaticSSR/EmployeeApp.BlazorStaticSSR.csproj
```

Then navigate to: `https://localhost:5002`

**Features:**
- Component-based architecture with Razor components
- Server-side rendering without interactivity
- No JavaScript for UI interactions
- Page reloads on navigation (similar to Razor Pages)
- Enhanced navigation with Blazor's enhanced navigation

### 3. Blazor WebAssembly UI

```bash
dotnet run --project src/EmployeeApp.BlazorSPA/EmployeeApp.BlazorSPA/EmployeeApp.BlazorSPA.csproj
```

Then navigate to: `https://localhost:5003`

**Features:**
- True single-page application (SPA) experience
- Client-side execution via WebAssembly
- No page reloads - instant UI updates
- Includes minimal API endpoints for data access:
  - `GET /api/employees` - Get all employees
  - `GET /api/employees/{id}` - Get single employee
  - `POST /api/employees` - Create employee
  - `PUT /api/employees/{id}` - Update employee
  - `DELETE /api/employees/{id}` - Delete employee
- Interactive components with real-time validation

## Understanding the Three Approaches

### Razor Pages

**Best for:**
- Traditional server-side rendered applications
- Teams familiar with ASP.NET MVC patterns
- SEO-critical pages

**Characteristics:**
- Page-focused (one .cshtml + .cshtml.cs per page)
- Server-side rendering only
- Full page reloads on form submission
- Simple, proven architecture

### Blazor Static SSR

**Best for:**
- Teams wanting component-based architecture without JavaScript
- Progressive enhancement scenarios
- Building reusable component libraries

**Characteristics:**
- Component-based (reusable .razor components)
- Server-side rendering only (no interactive mode)
- No JavaScript required for basic functionality
- Enhanced navigation for better perceived performance
- More modern than Razor Pages, same SEO benefits

### Blazor WebAssembly

**Best for:**
- Rich, interactive applications
- Real-time updates without page reloads
- Applications needing client-side state management

**Characteristics:**
- True SPA experience
- Runs client-side in the browser via WebAssembly
- No page reloads during normal operation
- Requires API endpoints for data access
- Can leverage full .NET runtime on the client

## Data Storage

All three implementations use CSV files for data storage:

- **Location:** `data/employees.csv` in each project's directory
- **Format:** Comma-separated values with header row
- **Sample data included:** 5 pre-populated employee records

**Note:** Each UI variant maintains its own CSV file for demonstration purposes.

## Troubleshooting

### Port Already in Use

If you see a port conflict error:

```bash
# Specify a different port
dotnet run --project src/EmployeeApp.RazorPages/EmployeeApp.RazorPages.csproj --urls "https://localhost:5010"
```

### Build Errors

```bash
# Clean and rebuild
dotnet clean src/EmployeeCore.Shared/EmployeeCore.Shared.csproj
dotnet build src/EmployeeCore.Shared/EmployeeCore.Shared.csproj
```

### CORS Issues (Blazor WASM)

The Blazor WASM project includes CORS configuration, but if you encounter issues:

1. Check that both server and client projects are running
2. Verify the API endpoints return expected responses
3. Check browser console for specific error messages

### CSV File Not Found

If the application can't find the CSV file:

1. Ensure the `data/` directory exists in the project folder
2. Create `data/employees.csv` with the header row: `Id,FirstName,LastName,Email,Department,HireDate,Salary`
3. The application will create the file automatically if it doesn't exist

## License

This is a demonstration project for educational purposes.

## References

- [ASP.NET Core Blazor Fundamentals (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/blazor/fundamentals?view=aspnetcore-10.0)
- [ASP.NET Core Razor Class Libraries with Static SSR (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/class-libraries-and-static-server-side-rendering?view=aspnetcore-10.0)
- [Blazor Render Modes (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/render-modes?view=aspnetcore-10.0)
- [Razor Pages in ASP.NET Core (.NET 10)](https://learn.microsoft.com/en-us/aspnet/core/razor-pages/?view=aspnetcore-10.0)
