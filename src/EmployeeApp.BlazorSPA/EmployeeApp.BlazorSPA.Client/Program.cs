using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using EmployeeApp.BlazorSPA.Client.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);

// Register HttpClient
builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });

// Register Employee API Client
builder.Services.AddScoped<EmployeeApiClient>();

await builder.Build().RunAsync();
