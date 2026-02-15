using EmployeeCore.Shared.Models;
using System.Text.Json;

namespace EmployeeApp.BlazorSPA.Client.Services;

public class EmployeeApiClient
{
    private readonly HttpClient _httpClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public EmployeeApiClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    public async Task<List<Employee>> GetAllAsync()
    {
        var response = await _httpClient.GetAsync("api/employees");
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<Employee>>(content, _jsonOptions) ?? new List<Employee>();
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        var response = await _httpClient.GetAsync($"api/employees/{id}");
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<Employee>(content, _jsonOptions);
    }

    public async Task<Employee> CreateAsync(Employee employee)
    {
        var json = JsonSerializer.Serialize(employee, _jsonOptions);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync("api/employees", content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<Employee>(responseContent, _jsonOptions) ?? employee;
    }

    public async Task<Employee?> UpdateAsync(Employee employee)
    {
        var json = JsonSerializer.Serialize(employee, _jsonOptions);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        var response = await _httpClient.PutAsync($"api/employees/{employee.Id}", content);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<Employee>(responseContent, _jsonOptions) ?? employee;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var response = await _httpClient.DeleteAsync($"api/employees/{id}");
        return response.IsSuccessStatusCode;
    }
}
