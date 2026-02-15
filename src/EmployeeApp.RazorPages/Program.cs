using EmployeeCore.Shared.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();

// Register CSV Employee Repository
var csvPath = Path.Combine(builder.Environment.ContentRootPath, "data", "employees.csv");
builder.Services.AddScoped<IEmployeeRepository>(sp => new CsvEmployeeRepository(csvPath));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.Run();
