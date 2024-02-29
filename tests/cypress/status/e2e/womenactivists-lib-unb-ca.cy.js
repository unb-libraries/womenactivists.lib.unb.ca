const host = 'https://womenactivists.lib.unb.ca'
describe('Woman Social Activists of Atlantic Canada', {baseUrl: host, groups: ['sites']}, () => {

  context('Front page', {baseUrl: host}, () => {
    beforeEach(() => {
      cy.visit('/')
      cy.title()
        .should('contain', 'Women Social Activists of Atlantic Canada')
    })

    specify('Menu should contain link to "Activists"', () => {
      cy.get('"block-womenactivists-lib-unb-ca-main-navigation')
        .contains(/^Activists$/)
        .its('0.href')
        .should('match', /\/activists$/)
    });
  })

  context('Activists page', {baseUrl: `${host}/activists?tid=1`}, () => {
    beforeEach(() => {
      cy.visit('')
      cy.title()
        .should('contain', 'Activists')
    })

    specify('9+ activists\' profiles should be listed, including "Mary Majka"', () => {
      cy.get('.view-activists .views-row').as('activists')
        .should('have.lengthOf.at.least', 9)
      cy.get('@activists')
        .contains('Mary Majka')
        .its('0.href')
        .should('match', /\/content\/mary-majka$/)
    });
  })

})
