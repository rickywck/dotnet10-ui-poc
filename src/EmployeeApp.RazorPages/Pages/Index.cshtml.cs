using EmployeeCore.Shared.Models;
using EmployeeCore.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EmployeeApp.RazorPages.Pages;

public class IndexModel : PageModel
{
    private readonly IEmployeeRepository _repository;

    public IndexModel(IEmployeeRepository repository)
    {
        _repository = repository;
    }

    public List<Employee> Employees { get; set; } = new();

    public async Task OnGetAsync()
    {
        Employees = await _repository.GetAllAsync();
    }
}
