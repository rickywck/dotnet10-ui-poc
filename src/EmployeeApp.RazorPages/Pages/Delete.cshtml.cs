using EmployeeCore.Shared.Models;
using EmployeeCore.Shared.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EmployeeApp.RazorPages.Pages;

public class DeleteModel : PageModel
{
    private readonly IEmployeeRepository _repository;

    public DeleteModel(IEmployeeRepository repository)
    {
        _repository = repository;
    }

    [BindProperty]
    public Employee Employee { get; set; } = new();

    public async Task<IActionResult> OnGetAsync(int id)
    {
        var employee = await _repository.GetByIdAsync(id);
        if (employee == null)
        {
            return NotFound();
        }

        Employee = employee;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync(int id)
    {
        var deleted = await _repository.DeleteAsync(id);
        if (!deleted)
        {
            return NotFound();
        }

        return RedirectToPage("./Index");
    }
}
