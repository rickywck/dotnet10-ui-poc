using EmployeeCore.Shared.Models;

namespace EmployeeCore.Shared.Services;

public interface IEmployeeRepository
{
    Task<List<Employee>> GetAllAsync();
    Task<Employee?> GetByIdAsync(int id);
    Task<Employee> CreateAsync(Employee employee);
    Task<Employee?> UpdateAsync(Employee employee);
    Task<bool> DeleteAsync(int id);
}
