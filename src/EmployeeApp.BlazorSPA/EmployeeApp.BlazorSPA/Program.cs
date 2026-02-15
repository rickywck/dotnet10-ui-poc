using EmployeeApp.BlazorSPA.Client.Pages;
using EmployeeApp.BlazorSPA.Components;
using EmployeeCore.Shared.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveWebAssemblyComponents();

// Register CSV Employee Repository
var csvPath = Path.Combine(builder.Environment.ContentRootPath, "data", "employees.csv");
builder.Services.AddScoped<IEmployeeRepository>(sp => new CsvEmployeeRepository(csvPath));

// Add CORS for WASM
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseWebAssemblyDebugging();
}
else
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}
app.UseStatusCodePagesWithReExecute("/not-found", createScopeForStatusCodePages: true);
app.UseHttpsRedirection();
app.UseAntiforgery();
app.UseCors();

app.MapStaticAssets();
app.MapRazorComponents<App>()
    .AddInteractiveWebAssemblyRenderMode()
    .AddAdditionalAssemblies(typeof(EmployeeApp.BlazorSPA.Client._Imports).Assembly);

// API Endpoints for WASM client
app.MapGet("/api/employees", async (IEmployeeRepository repository) =>
{
    return await repository.GetAllAsync();
});

app.MapGet("/api/employees/{id}", async (int id, IEmployeeRepository repository) =>
{
    var employee = await repository.GetByIdAsync(id);
    return employee is not null ? Results.Ok(employee) : Results.NotFound();
});

app.MapPost("/api/employees", async (EmployeeCore.Shared.Models.Employee employee, IEmployeeRepository repository) =>
{
    var created = await repository.CreateAsync(employee);
    return Results.Created($"/api/employees/{created.Id}", created);
});

app.MapPut("/api/employees/{id}", async (int id, EmployeeCore.Shared.Models.Employee employee, IEmployeeRepository repository) =>
{
    if (id != employee.Id)
    {
        return Results.BadRequest();
    }

    var updated = await repository.UpdateAsync(employee);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});

app.MapDelete("/api/employees/{id}", async (int id, IEmployeeRepository repository) =>
{
    var deleted = await repository.DeleteAsync(id);
    return deleted ? Results.NoContent() : Results.NotFound();
});

app.Run();
