using EmployeeApp.BlazorStaticSSR.Components;
using EmployeeCore.Shared.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Configure for Static SSR (no interactive components)
builder.Services.AddRazorComponents();

// Register CSV Employee Repository
var csvPath = Path.Combine(builder.Environment.ContentRootPath, "data", "employees.csv");
builder.Services.AddScoped<IEmployeeRepository>(sp => new CsvEmployeeRepository(csvPath));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();
app.UseAntiforgery();

app.MapStaticAssets();
app.MapRazorComponents<App>();

app.Run();
