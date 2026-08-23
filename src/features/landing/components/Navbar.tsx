import { Flex, View } from '@aws-amplify/ui-react'
import { Link, NavLink } from 'react-router-dom'

const anchorLinkClassName =
  'text-sm font-medium text-neutral-600 no-underline transition-colors hover:text-neutral-900'

export function Navbar() {
  return (
    <View
      as="header"
      className="sticky top-0 z-20 border-b border-neutral-200/60 bg-white/80 backdrop-blur"
    >
      <Flex
        as="nav"
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        padding="medium"
        maxWidth="1120px"
        margin="0 auto"
      >
        <NavLink
          to="/"
          className="text-lg font-bold tracking-tight text-neutral-900 no-underline"
        >
          3DFormio
        </NavLink>
        <Flex direction="row" gap="xl" alignItems="center">
          <a href="#precos" className={anchorLinkClassName}>
            Preços
          </a>
          <a href="#faq" className={anchorLinkClassName}>
            FAQ
          </a>
          <Link to="/studio" className={anchorLinkClassName}>
            Studio 3D
          </Link>
          <Link to="/cadastro" className="btn-primary">
            Criar conta
          </Link>
        </Flex>
      </Flex>
    </View>
  )
}
