import { NavLink, NavLinkProps } from "@mantine/core";
import { usePageContext } from "vike-react/usePageContext";

interface LinkProps extends Omit<NavLinkProps, 'active'> {
  href: string;
}

export function Link({ href, ...props }: LinkProps) {
  const pageContext = usePageContext();
  const { urlPathname } = pageContext;
  const isActive = href === "/" ? urlPathname === href : urlPathname?.startsWith(href);
  return <NavLink href={href} active={isActive} {...props} />;
}
