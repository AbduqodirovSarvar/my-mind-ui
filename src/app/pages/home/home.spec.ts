import { TestBed } from '@angular/core/testing';
import { Home } from './home';

describe('Home', () => {
  it('should render the site name', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('MyMind');
  });
});
